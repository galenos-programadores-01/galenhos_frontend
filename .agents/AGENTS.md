# AGENTS.md

## Contexto del Proyecto: Hospital Nacional Sergio E. Bernales
El sistema "Galenos" es el software de administración hospitalaria diseñado específicamente para el **Hospital Nacional Sergio E. Bernales** (hospital de alta complejidad en Perú).
Este centro de salud maneja un volumen masivo de pacientes referidos y cuenta con áreas críticas y especialidades como **Emergencia, Gineco-Obstetricia, Patología Clínica, Cirugía, Pediatría y Medicina**.
Toda la arquitectura, interfaz de usuario y optimización del código deben estar pensadas para un uso intensivo y escalable entre estos múltiples departamentos.

## Tecnologías y Convenciones Base
Angular 22 standalone SPA. UI text, component/file naming, and code comments are in Spanish; Angular symbols (interfaces, DI, signals) use standard conventions. There is no NgModule anywhere — everything is standalone + `bootstrapApplication`.
## Commands

- Dev server: `bun run dev` (`ng serve`, port 4200) -> **Regla Estricta para la IA:** NO debes ejecutar el servidor de desarrollo. Tu trabajo es realizar los cambios en el código, ejecutar el linter o build si es necesario, y luego notificar al usuario para que él mismo levante el servidor y valide visualmente.
- Production build: `bun run build`
- Tests: `bun run test` (`ng test` via `@angular/build:unit-test` = Vitest, globals in `tsconfig.spec.json`; jsdom). No spec files exist yet — create `*.spec.ts` beside components.
- There are **no** lint/typecheck npm scripts. Use `npx biome check .` para el linting y `npx tsc --noEmit` para verificar los tipos sin generar archivos compilados que luego Biome intente formatear.

## Formatting y Buenas Prácticas (Reglas Estrictas)

- **Formateo Exclusivo con Biome:** Se utilizará **únicamente** Biome para el linting y formateo de código (`npx biome check --write .`). Ignorar Prettier para evitar conflictos.
- **Prohibido Ignorar Errores (Biome):** Está estrictamente prohibido utilizar comentarios como `// biome-ignore` o similares para evadir reglas de linting. Todo error reportado por Biome debe ser solucionado obligatoriamente en el código.
- **Tipado Estricto:** Está completamente prohibido el uso de `any`. Siempre se deben definir tipos e interfaces adecuados.
- **Nomenclatura Clara:** Prohibido el uso de nombres abreviados o de una sola letra (como `T`, `e`, `idx`). Todo debe tener nombres descriptivos y completos.
- **Refactorización y Optimización Continua:** Siempre que se edite un archivo, se debe aprovechar para optimizar el código, eliminar código muerto y mejorar la eficiencia.
- **Lógica y Sintaxis Moderna (2026):** Utilizar exclusivamente patrones modernos (Angular Signals, nuevo Control Flow de Angular, últimas características de ECMAScript/TypeScript). Prohibido el uso de lógica antigua o patrones obsoletos.

## All HTTP goes through ApiClientService (native `fetch`)

There is no Angular HttpClient / `provideHttpClient`. `src/app/compartido/api-client/api-client.service.ts` wraps native `fetch`.

- Base URL: `http://<current hostname>:8080`, overridable via `localStorage['galenos.apiBaseUrl']` (set by the Configuración page; trailing `/` stripped).
- Every backend call returns an envelope `{ success, data?, error? }`; success is unwrapped, failures throw `ApiRequestError(code, message, status)`.
- Auth: Bearer token from `localStorage['galenos.accessToken']`; `Http 401` with `requiresAuth` triggers `AuthService.logout()`. Menu/permission data also lives in `localStorage` (`galenos.menus`, `galenos.permisos`).
- No request proxy in `angular.json`; the dev server calls the backend directly.

## Source layout (hexagonal-ish, Spanish names)

- `src/app/modulos/<modulo>/adaptadores/entrada/ui/paginas|componentes/*` — UI pages/components per module
- `src/app/modulos/<modulo>/adaptadores/salida/http/*.api.service.ts` — backend API services (thin, call `ApiClientService`)
- `src/app/modulos/<modulo>/aplicacion/*` — cross-cutting services/guards (e.g. `auth.guard.ts`)
- `src/app/compartido/<ui|api-client|tipos|utilidades>` — shared components, envelope types, validators, print/mappers
- Exception: `evolucion-medica` uses its own shape (`servicios/`, `componentes/`, nested `formulario-soap/`) instead of `adaptadores/`.

Bootstrap: `src/main.ts` → `configuracion-global.ts` (`ApplicationConfig`, only `provideZoneChangeDetection` + `provideRouter`). Routes live in `src/app/rutas/rutas-principales.ts` (note the Spanish filename); register new pages there — most are eager `component`, `sis` and `hospitalizacion` use `loadComponent`. Root component: `src/app/raiz/componente-raiz.ts`.

## Styling

Tailwind 4 (`@import 'tailwindcss'` in `src/styles.css`), no config file. Custom `gp-*` animations/utilities live in `src/styles.css`.

## Git workflow

Per-developer/feature branches (`Nicolas_dev`, `feature/*`) merged into `main` via PRs (friend rebase during merge). Commit messages mix `conventional-commits` `feat:`/`fix:` with free-form Spanish. No CI or pre-commit hooks in the repo.

## Diseño y Componentes UI (Reglas Estrictas)

- **Criterio de Diseño Exigente:** Mantener un alto estándar visual. Prohibido dejar elementos desbordados, desalineados, o botones sin el tamaño y padding adecuado. Todo debe verse profesional y ordenado.
- **Enfoque Empresarial (Hospitalario):** Pensar y diseñar la UI considerando que es un sistema escalable para un hospital inmenso con múltiples áreas. La interfaz debe ser clara y optimizada para uso intensivo.
- **Libertad de Maquetación (Tailwind CSS puro):** Está permitido y fomentado crear componentes UI personalizados (botones, tarjetas, modales, tablas, etc.) utilizando **Tailwind CSS v4 puro**. No es obligatorio depender de librerías de componentes prefabricadas como PrimeNG o DaisyUI si no encajan con la estética del proyecto. **Antes de crear un nuevo componente desde cero, es estrictamente obligatorio buscar y verificar si ya existe un componente similar en la carpeta de componentes compartidos o globales.** Se debe priorizar siempre la reutilización de estilos e infraestructura existente.