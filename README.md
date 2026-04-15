VCM2
Un album de recuerdos

Cómo ejecutar
Desde la raíz del repositorio (/workspace/VCM2), levanta un servidor estático.
Opción Python: python3 -m http.server 8000
Opción VSCode: Live Server apuntando a la raíz del repo.
Abre la app en el navegador con http://localhost:8000/index.html (ajusta el puerto si usas otro).
No uses file:// ni abras index.html con doble clic, porque las peticiones a recursos como https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson pueden fallar por políticas del navegador.
Verifica en DevTools > Network que https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson responde 200.

## Solución rápida: error CORS al subir audios a Firebase Storage

Si la app queda en “Subiendo...” y en consola aparece algo como:
`Response to preflight request doesn't pass access control check`,
el bucket de Firebase Storage no permite tu dominio como `origin`.

1. Crea un archivo `cors.json` con:
```json
[
  {
    "origin": [
      "https://sofisuarez49-creator.github.io",
      "http://localhost:8000",
      "http://127.0.0.1:8000"
    ],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
```

2. Aplica CORS al bucket (requiere Google Cloud SDK):
```bash
gcloud storage buckets update gs://univoicer-580d6.firebasestorage.app --cors-file=cors.json
```

3. Espera unos minutos y vuelve a probar la subida desde GitHub Pages.
