// Override en tiempo de ejecución para la URL del backend — editable sin
// reconstruir la app (solo recargar el navegador). Déjalo vacío para usar
// la detección automática de Codespaces/VS Code Ports, o el valor
// compilado en environment.ts/environment.development.ts, ambos resueltos
// en src/main.ts.
//
// Ejemplo (URL pública temporal del backend vía VS Code Ports/Codespaces):
// window.__API_URL__ = 'https://mi-codespace-3000.app.github.dev/api';
window.__API_URL__ = '';
