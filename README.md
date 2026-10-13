# Galenos Pro — Frontend (Angular)

Aplicación web de gestión hospitalaria y atención médica desarrollada con Angular.

---

## Requisitos Previos

- Node.js (versión 20 o superior recomendada)
- Gestor de paquetes npm

---

## Cómo Compilar y Ejecutar

### 1. Instalación de Dependencias

Ejecuta este comando antes de compilar o arrancar por primera vez, o siempre que se actualicen las librerías:

```bash
npm install
```

---

### 2. Ejecutar en Modo Desarrollo

#### En PowerShell:
```powershell
npm start
```
> [!NOTE]
> Usar `npm start` evita el error de políticas de ejecución de scripts de Windows (`ExecutionPolicy Restricted`) que suele ocurrir al intentar ejecutar `ng serve` directamente. Si necesitas usar Angular CLI directamente, puedes usar `npx ng serve`.

#### En Git Bash / Linux:
```bash
npm start
```
O alternativamente:
```bash
npx ng serve
```

Una vez que el servidor compile y arranque, abre el navegador web en `http://localhost:4200/`. La aplicación se recargará automáticamente al guardar cambios en los archivos fuente.

---

### 3. Compilar para Producción

Genera los archivos optimizados y empaquetados en la carpeta `dist/`:

#### En PowerShell:
```powershell
npm run build
```

#### En Git Bash / Linux:
```bash
npm run build
```

Si deseas compilar en modo desarrollo con mapas de código fuente (`source maps`):
```bash
npm run watch
```

---

### 4. Pruebas Unitarias y Validación de Código

- **Pruebas unitarias (Vitest):**
  ```bash
  npm test
  ```
- **Formateo de código (Biome):**
  ```bash
  npm run format
  ```
- **Revisión de calidad y linter (Biome):**
  ```bash
  npm run lint
  ```

---

## Solución de Problemas Frecuentes

### 1. Error de Política de Scripts en PowerShell
- **Mensaje:** `ng.ps1 no se puede cargar porque la ejecución de scripts está deshabilitada en este sistema.`
- **Solución:** Ejecutar siempre `npm start` o `npm run build`. Alternativamente, puedes habilitar temporalmente la ejecución para tu sesión actual de PowerShell con:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```

### 2. Comando no encontrado (`command not found`)
- **Mensaje:** `bash: ng: command not found` o `El término 'ng' no se reconoce...`
- **Solución:** No es necesario tener Angular CLI instalado globalmente. Usa siempre los scripts de npm (`npm start`, `npm run build`) o invoca con `npx` (`npx ng serve`).
