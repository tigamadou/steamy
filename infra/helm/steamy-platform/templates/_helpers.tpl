{{- define "platform.labels" -}}
app.kubernetes.io/part-of: steamy-platform
app.kubernetes.io/managed-by: {{ .Release.Service }}
steamy.io/environment: {{ .Values.environment }}
{{- end }}

{{/* Préfixe des sauvegardes dans le bucket Wasabi : un dossier par environnement */}}
{{- define "platform.backupPrefix" -}}
s3://{{ .Values.backups.wasabi.bucket }}/{{ .Values.environment }}
{{- end }}

{{/* Remote rclone `rustfs:` (RustFS du cluster), configuré par variables d'env */}}
{{- define "platform.rcloneRustfs" -}}
- { name: RCLONE_CONFIG_RUSTFS_TYPE, value: s3 }
- { name: RCLONE_CONFIG_RUSTFS_PROVIDER, value: Other }
- { name: RCLONE_CONFIG_RUSTFS_ENDPOINT, value: "http://steamy-rustfs:9000" }
- name: RCLONE_CONFIG_RUSTFS_ACCESS_KEY_ID
  valueFrom: { secretKeyRef: { name: {{ .Values.secretName }}, key: AWS_ACCESS_KEY_ID } }
- name: RCLONE_CONFIG_RUSTFS_SECRET_ACCESS_KEY
  valueFrom: { secretKeyRef: { name: {{ .Values.secretName }}, key: AWS_SECRET_ACCESS_KEY } }
- { name: RCLONE_CONFIG_DIR, value: /tmp }
{{- end }}
