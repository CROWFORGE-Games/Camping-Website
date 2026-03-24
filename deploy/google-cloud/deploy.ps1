param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$Region,

  [Parameter(Mandatory = $true)]
  [string]$ServiceName,

  [Parameter(Mandatory = $true)]
  [string]$BucketName,

  [string]$ServiceAccountName = "camping-website-runner",

  [string]$AdminEmail = "admin@example.com",
  [string]$BookingRecipientEmail = "info@hiasenhof-thiersee.at",
  [string]$BookingPhone = "+43 664 885 305 24",

  [Parameter(Mandatory = $true)]
  [string]$SessionSecret,

  [Parameter(Mandatory = $true)]
  [string]$AdminPassword,

  [string]$GoogleAppsScriptWebhookUrl = "",
  [string]$GoogleAppsScriptToken = "",
  [string]$GoogleAppsScriptBookingsSheet = "Buchungen",
  [string]$GoogleAppsScriptContactSheet = "Anfragen",
  [string]$GoogleAppsScriptSpotsSheet = "Spots"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ServiceAccountEmail = "$ServiceAccountName@$ProjectId.iam.gserviceaccount.com"
$SecretSession = "$ServiceName-session-secret"
$SecretAdmin = "$ServiceName-admin-password"
$SecretAppsScriptToken = "$ServiceName-apps-script-token"
$EnvFile = Join-Path $PSScriptRoot "cloudrun.env.generated.yaml"
$AppsScriptEnabled = if ([string]::IsNullOrWhiteSpace($GoogleAppsScriptWebhookUrl)) { "false" } else { "true" }

function Add-SecretVersion {
  param(
    [Parameter(Mandatory = $true)][string]$SecretName,
    [Parameter(Mandatory = $true)][string]$Value
  )

  $Value | gcloud secrets versions add $SecretName --data-file=-
}

gcloud config set project $ProjectId

gcloud services enable `
  run.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com `
  iam.googleapis.com `
  storage.googleapis.com

$serviceAccountExists = gcloud iam service-accounts list --filter="email:$ServiceAccountEmail" --format="value(email)"
if (-not $serviceAccountExists) {
  gcloud iam service-accounts create $ServiceAccountName --display-name="Camping Website Cloud Run"
}

$bucketExists = gcloud storage buckets list --filter="name:gs://$BucketName" --format="value(name)"
if (-not $bucketExists) {
  gcloud storage buckets create "gs://$BucketName" --location=$Region --uniform-bucket-level-access
}

gcloud storage buckets add-iam-policy-binding "gs://$BucketName" `
  --member="serviceAccount:$ServiceAccountEmail" `
  --role="roles/storage.objectAdmin"

foreach ($secretName in @($SecretSession, $SecretAdmin, $SecretAppsScriptToken)) {
  $secretExists = gcloud secrets list --filter="name:$secretName" --format="value(name)"
  if (-not $secretExists) {
    gcloud secrets create $secretName --replication-policy="automatic"
  }

  gcloud secrets add-iam-policy-binding $secretName `
    --member="serviceAccount:$ServiceAccountEmail" `
    --role="roles/secretmanager.secretAccessor" | Out-Null
}

Add-SecretVersion -SecretName $SecretSession -Value $SessionSecret
Add-SecretVersion -SecretName $SecretAdmin -Value $AdminPassword
Add-SecretVersion -SecretName $SecretAppsScriptToken -Value $GoogleAppsScriptToken

@"
NODE_ENV: "production"
TRUST_PROXY: "1"
SESSION_COOKIE_SECURE: "true"
ADMIN_EMAIL: "$AdminEmail"
BOOKING_RECIPIENT_EMAIL: "$BookingRecipientEmail"
BOOKING_PHONE: "$BookingPhone"
GOOGLE_APPS_SCRIPT_ENABLED: "$AppsScriptEnabled"
GOOGLE_APPS_SCRIPT_WEBHOOK_URL: "$GoogleAppsScriptWebhookUrl"
GOOGLE_APPS_SCRIPT_BOOKINGS_SHEET: "$GoogleAppsScriptBookingsSheet"
GOOGLE_APPS_SCRIPT_CONTACT_SHEET: "$GoogleAppsScriptContactSheet"
GOOGLE_APPS_SCRIPT_SPOTS_SHEET: "$GoogleAppsScriptSpotsSheet"
DATA_DIR: "/mnt/state/data"
UPLOADS_DIR: "/mnt/state/uploads"
"@ | Set-Content -Encoding utf8 $EnvFile

$secretMappings = @(
  "SESSION_SECRET=$SecretSession:latest",
  "ADMIN_PASSWORD=$SecretAdmin:latest"
)

if (-not [string]::IsNullOrWhiteSpace($GoogleAppsScriptToken)) {
  $secretMappings += "GOOGLE_APPS_SCRIPT_TOKEN=$SecretAppsScriptToken:latest"
}

gcloud run deploy $ServiceName `
  --source $ProjectRoot `
  --region $Region `
  --service-account $ServiceAccountEmail `
  --allow-unauthenticated `
  --port 8080 `
  --concurrency 1 `
  --max-instances 1 `
  --execution-environment gen2 `
  --env-vars-file $EnvFile `
  --set-secrets ($secretMappings -join ",") `
  --add-volume=name=state,type=cloud-storage,bucket=$BucketName `
  --add-volume-mount=volume=state,mount-path=/mnt/state

Write-Host ""
Write-Host "Deployment abgeschlossen."
Write-Host "Hinweis: cloudrun.env.generated.yaml enthaelt keine Secrets, aber projektbezogene Werte."
