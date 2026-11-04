# Arquitectura final propuesta

## Flujo

React + TanStack Start SSR -> loaders y services/content.ts -> ContentRepository -> MockContentRepository o WordPressContentRepository -> API pública RIVTON Core -> modelos WordPress. WordPress es el único backoffice. Las mutaciones privadas nunca pasan por credenciales de navegador. Formularios públicos usan un endpoint protegido, no permisos editoriales.

Instalación independiente por inmobiliaria: WordPress, DB, uploads, dominios, secretos, catálogo, usuarios, backups e integraciones separados. Motor neutral y configuración de marca por instalación. No se implementa multi-tenancy compartido.

## Contratos

Los 14 modelos solicitados se exportan con tipos derivados de esquemas Zod. IDs estables independientes de slugs; schemaVersion para evolución, revision para concurrencia y extensiones reservadas por namespace. Las extensiones son datos no confiables, no HTML ni código, y no deben renderizarse sin un esquema registrado. No exponer destinatarios privados, credenciales o notas comerciales en SiteSettings/IntegrationSettings públicos.

Property comercial contiene IDs de categorías/características, estado comercial, media y SEO. El snapshot v1 compatible conserva el DTO de lib/types para evitar alterar los componentes aprobados. RIVTON Core deberá producir esa proyección o un adaptador probado; no mezclar sin migración. El catálogo de tipos permanece cerrado en la proyección; ampliar taxonomías exige primero adaptar filtros y UI. La versión siguiente debe incorporar idiomas, monedas adicionales, sucursales, formularios, FAQ, redirects y políticas con esquemas propios, no extensions sin validar.

## Datos y caché

read entrega copia aislada. Mock no modifica fixtures. WordPress exige HTTPS, omite cookies, rechaza redirecciones, valida content-type y DTO, limita cuerpo a 2 MB y timeout de 8 segundos. No publica errores internos. TTL 30s, coalescencia concurrente, invalidate con generación evita repoblar caché obsoleta. Caché por instancia/entorno; futuro BFF y caché distribuida con etiqueta installation:revision y webhook HMAC. Fallar explícitamente ante caída de CMS; no inventar disponibilidad ni sustituir por mock en producción. Configuración de deployment no equivale a contenido editorial.

## Tokens

CSS aprobado es la fuente de valores iniciales. defaultTheme no sobreescribe nada; themeVariables produce únicamente variables allowlist. React aplica style durante SSR, evitando un cambio de tema posterior a hidratación. Paleta y glass existentes ya consumen variables. Radius y fuentes usan variables existentes. Espaciado usa --spacing. Ancho/blur/botones se conectan con fallback al mismo valor. Las escalas de la tipografía Tailwind están conectadas. Los tamaños arbitrarios de algunos bloques y sectionColors se migrarán con sus renderers, conservando los valores originales. Los pesos se limitan a fuentes aprobadas; no se cargan URLs de fuentes arbitrarias.

## Páginas

PageDefinition contiene secciones con ID, tipo permitido, contenido plano, diseño enumerado, visibilidad, orden, responsive, acciones y media. orderedSections valida IDs únicos y orden estable; SectionRegistry recibe componentes explícitos, nunca imports dinámicos indicados por CMS. Fase 1 prepara estructura; Fase 3 conecta renderers preservando clases, animaciones, DOM y sticky stage. No se implementa drag-and-drop. Story es un bloque indivisible para mantener sus escenas coordinadas. Unknown type se rechaza al publicar y se registra sin exponer contenido privado.

## Dependencias y decisiones

ADR-01 mantener TanStack Start y router generado. ADR-02 no ACF presunto. ADR-03 DTO compatible para extracción incremental. ADR-04 mock explícito sólo desarrollo/demo. ADR-05 configuración WordPress revalidada en runtime, sin rebuild editorial. ADR-06 credenciales sólo servidor. ADR-07 instalaciones aisladas. ADR-08 no certificación de seguridad/AA sin pruebas. Dependencias: contenido real, fotos/derechos, WordPress compatible probado en Fase 2, dominio, mail, Calendly, consentimiento y asesoría legal. La documentación de release incluye gates antes de activar el proveedor.


## Semántica de filtros de compatibilidad

Las claves operacion/tipo/ubicacion/precioMax/dormitorios/banos/piscina/orden se conservan. La UI lee el esquema para nombres, opciones, orden y visibilidad; presentations incompatibles y valores de taxonomía desconocidos se rechazan. moneda/superficieMin/caracteristicas están soportados y ocultos inicialmente; superficie compara cubiertos y, si faltan, terreno, en m2. caracteristicas acepta un array de IDs estables presentes en featureIds; no convierte etiquetas libres en IDs. Precio máximo sin moneda explícita conserva el significado USD de la interfaz aprobada, no convierte ARS/USD. El orden por precio en catálogos mixtos necesita moneda seleccionada o un criterio de agrupación aprobado antes de activar esa combinación comercial. Ocultar un filtro no invalida enlaces ya publicados; las claves legacy siguen parseándose. La creación de tipos completamente nuevos requiere la migración de la proyección en Fase 3.
