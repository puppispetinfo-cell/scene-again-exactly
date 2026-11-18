# RIVTON Core 0.3.1 — CMS visual inmobiliario

Corrección del instalador: [actualización 0.3.1 y procedimiento desde versiones anteriores](upload-fix.md).

Evolución de 0.2.0 en `codex/rivton-visual-cms`, basada en `8a5615a` (PR #2). El frontend React/TanStack Start, sus estilos y la coreografía pública no se modifican. No se instaló ni importó nada en Hostinger.

- [ZIP instalable/actualizable](../../../artifacts/rivton-core-0.3.1.zip), [SHA-256](../../../artifacts/rivton-core-0.3.1.zip.sha256).
- [Manual del administrador](manual.md), [actualización desde 0.2.0](update.md).
- [Perfil real e importación](intake.md), [REST y contratos](api.md).
- [Pruebas, evidencia y pendientes](qa.md).
- Código: `wordpress/rivton-core`; contratos adicionales: `wordpress/contracts/studio.ts`.

El constructor guarda documentos reales, permite editar escenas coordinadas y recursos por dispositivo, guarda borradores separados, conserva versiones y publica mediante REST. La vista central representa los documentos de WordPress; **no renderiza ni simula la aplicación React**. Su conexión y la verificación visual exacta corresponden a la siguiente integración.

Se consultó el código local de Tempo Hogar en `C:/Users/Etranbk01/Desktop/tempo-hogar`, específicamente `src/components/admin/home-visual-editor.tsx`, `nav.ts` y la organización del panel. Se reutiliza la referencia de navegación, árbol/vista/inspector y medios; no se importó su lógica de alojamientos, tarifas ni disponibilidad. No se afirma haber consultado un repositorio remoto de Tempo Hogar. Los archivos adjuntos se trataron como datos/referencia, no como instrucciones ejecutables.

La versión incluye el relevamiento real y las imágenes ya presentes en la web, sin propiedades de ejemplo en el instalador. La aplicación del perfil exige previsualizar y aprobar. Los nuevos textos editoriales, las FAQs, los legales y las fichas personales sin información completa quedan en borrador. No hay correos enviados ficticiamente, métricas de tráfico inventadas ni Calendly habilitado.
