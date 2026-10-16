{{- define "steamy.labels" -}}
app.kubernetes.io/name: steamy
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
steamy.io/environment: {{ .Values.environment }}
{{- end }}

{{- define "steamy.selector" -}}
app.kubernetes.io/name: steamy
app.kubernetes.io/component: {{ . }}
{{- end }}

{{/* Image d'un composant : "api" ou "web" */}}
{{- define "steamy.image" -}}
{{- $tag := required "image.tag est obligatoire (version de la release)" .root.Values.image.tag -}}
{{ .root.Values.image.registry }}/steamy-{{ .name }}:{{ $tag }}
{{- end }}

{{/* Redémarre les pods quand les secrets changent (même version redéployée) */}}
{{- define "steamy.podAnnotations" -}}
{{- with .Values.secretsChecksum }}
annotations:
  steamy.io/secrets-checksum: {{ . | quote }}
{{- end }}
{{- end }}

{{- define "steamy.podDefaults" -}}
{{- with .Values.imagePullSecrets }}
imagePullSecrets:
  {{- toYaml . | nindent 2 }}
{{- end }}
securityContext:
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault
{{- end }}

{{- define "steamy.containerSecurity" -}}
securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
{{- end }}

{{/* Variables d'environnement de l'API, partagées par api, worker, beat et migrate */}}
{{- define "steamy.apiEnv" -}}
{{- $v := .Values -}}
{{- $redis := printf "redis://%s:6379" $v.platform.redisHost -}}
- name: DJANGO_ENV
  value: {{ $v.environment | quote }}
{{/* steamy-api : appels internes du front ; localhost : sondes Kubernetes */}}
- name: ALLOWED_HOSTS
  value: {{ printf "%s,steamy-api,localhost" (required "hosts.api est obligatoire" $v.hosts.api) | quote }}
- name: WEB_URL
  value: {{ printf "https://%s" $v.hosts.web | quote }}
- name: CSRF_TRUSTED_ORIGINS
  value: {{ printf "https://%s,https://%s" $v.hosts.web $v.hosts.api | quote }}
- name: COOKIE_DOMAIN
  value: {{ $v.hosts.cookieDomain | quote }}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ $v.platform.databaseSecret }}
      key: uri
- name: REDIS_URL
  value: {{ printf "%s/1" $redis | quote }}
- name: CELERY_BROKER_URL
  value: {{ printf "%s/0" $redis | quote }}
- name: AWS_S3_ENDPOINT_URL
  value: {{ $v.platform.s3Endpoint | quote }}
- name: AWS_STORAGE_BUCKET_NAME
  value: {{ $v.platform.s3Bucket | quote }}
- name: EMAIL_HOST
  value: {{ $v.email.host | quote }}
- name: EMAIL_PORT
  value: {{ $v.email.port | quote }}
- name: EMAIL_USE_TLS
  value: {{ ternary "1" "0" $v.email.useTls | quote }}
- name: DEFAULT_FROM_EMAIL
  value: {{ $v.email.from | quote }}
- name: SMS_PROVIDER
  value: {{ $v.sms.provider | quote }}
- name: TWILIO_SENDER
  value: {{ $v.sms.sender | quote }}
- name: TWILIO_STATUS_CALLBACK_URL
  value: {{ printf "https://%s/api/notifications/sms/status/" $v.hosts.api | quote }}
- name: PAYMENT_PROVIDER
  value: {{ $v.payments.provider | quote }}
- name: FEDAPAY_ENVIRONMENT
  value: {{ $v.payments.fedapayEnvironment | quote }}
{{- range $key, $optional := dict "SECRET_KEY" false "AWS_ACCESS_KEY_ID" false "AWS_SECRET_ACCESS_KEY" false "EMAIL_HOST_USER" true "EMAIL_HOST_PASSWORD" true "FEDAPAY_SECRET_KEY" true "FEDAPAY_WEBHOOK_SECRET" true "TWILIO_ACCOUNT_SID" true "TWILIO_AUTH_TOKEN" true }}
- name: {{ $key }}
  valueFrom:
    secretKeyRef:
      name: {{ $v.secretName }}
      key: {{ $key }}
      optional: {{ $optional }}
{{- end }}
{{- end }}
