# Dependencias: registro de riesgos al 2026-11-04

Fuente: `bun audit --json` contra el lockfile de esta rama, exit 1 (hallazgos). Respuesta completa en dependency-audit.json. Se observaron 11 entradas de paquetes y 28 entradas de avisos: 1 crítica, 14 altas, 12 moderadas y 1 baja. Algunas entradas repiten un mismo advisory para rangos diferentes; no equivalen a 28 vulnerabilidades explotables independientes.

| Paquete reportado | Máxima severidad | Tratamiento requerido |
|---|---|---|
| shell-quote | crítica | localizar dependencia transitiva/camino invocable, actualizar a versión corregida compatible y probar tooling |
| zod | alta | migración coordinada a versión corregida, revisar compatibilidad de formularios/contratos y validar límites antes de parsear |
| brace-expansion | alta | actualizar transitivas de tooling, verificar globbing/lint/build |
| js-yaml | alta | actualizar transitivas y rechazar YAML no confiable donde se use |
| launch-editor / vite | alta | actualizar preset/Vite compatibles, desarrollo sólo loopback y nunca exponer servidor dev en producción |
| nanoid | alta | actualizar dependencia transitiva, verificar llamadas a generadores |
| source-map-js | alta | actualizar transitiva, no procesar source maps no confiables |
| @vitest/mocker | moderada | actualizar Vitest compatible y verificar tests; no exponer mock server a red |
| seroval | moderada | actualizar versión compatible con TanStack, probar serialización SSR y contratos |
| minimatch | moderada | actualizar transitivas de herramientas y verificar globs |

No se hizo actualización masiva de dependencias del motor en esta fase para no mezclar una migración de TanStack/preset/Zod con la preservación visual. Esto NO es aceptación de riesgo para producción: F7-01 y el gate F8 bloquean publicar hasta hacer triage, corregir y volver a auditar. El frontend no se declara seguro ni invulnerable. Antes de desplegar hay que separar dependencias de desarrollo/runtime y verificar aplicabilidad de cada aviso con sus caminos reales; el resumen no sustituye ese trabajo.

La única dependencia de prueba añadida es @playwright/test, con lockfile actualizado; no cambia el motor de routing ni el diseño. No se habilitaron integraciones ni credenciales.
