# SEO, AEO y GEO

Mantener TanStack Start SSR. Cada ruta resuelve contenido en loader y genera head desde datos publicados, no sólo useEffect. SEOSettings permite título/descripción/OG/canonical/index/follow y referencias estructuradas tipadas. Mantener slugs/URLs actuales, sin migrar router. buildSEOHead prepara meta/canonical/OG y fuerza noindex fuera de producción, con pruebas unitarias. La conexión de SEOSettings a todas las rutas aún está pendiente: los head existentes conservan su comportamiento.

| Caso | Política propuesta / aceptación |
|---|---|
| Institucional/propiedad publicada | HTML sin JS contiene H1, texto y enlaces, title/description únicos, canonical absoluto del dominio configurado |
| Búsqueda con parámetros | noindex,follow; canonical estable hacia listado limpio sólo si corresponde al contenido; sin indexación combinatoria |
| Favoritos/páginas privadas | noindex y no-store cuando contienen datos personales |
| Slug modificado | 301 único a nuevo slug, cadenas/bucles rechazados |
| Inexistente | HTTP 404 real; retirada definitiva 410 con alternativas útiles |
| Vendida/alquilada | conservar ficha informativa con estado real si aporta valor; decisión editorial de indexación, sin falso stock ni redirect masivo a home |
| Staging | autenticación + X-Robots-Tag noindex en respuestas; no depender sólo de robots disallow |
| Sitemap | generar desde publicadas indexables/canonical/200, lastmod real, excluir filtros/borradores/301/404/410; índice al superar límites del protocolo |
| Robots | generado por entorno, sitemap absoluto, sin esconder noindex detrás de disallow; validar archivo actual antes de staging |
| Media | ALT útil, ancho/alto, responsive srcset, formatos modernos, LCP prioritario y lazy en resto |

Schema.org se genera con serialización segura a partir de campos reales y tipos pertinentes; escape '<' en JSON-LD. No renderizar JSON arbitrario cargado por editor. Organization/contacto sólo verificado, BreadcrumbList desde rutas reales, FAQPage sólo preguntas/respuestas visibles reales, RealEstateListing sujeto a validación del tipo y datos disponibles. No inventar reviews/rating/ofertas/ubicaciones y no prometer rich result.

Contenido AEO/GEO: jerarquía de encabezados, respuestas concisas a FAQ reales, información consistente, enlaces inmueble-zona-categoría, fechas reales, fuentes para afirmaciones comprobables. Páginas de barrios sólo con información sustancial y verificable, sin producción masiva artificial. HTML accesible y rastreable; ninguna garantía de aparición en IA.

Search Console: responsable con acceso autorizado verifica propiedad de dominio por DNS, configura dominio canonical, envía sitemap de producción, inspecciona home y fichas, revisa indexación/exclusiones/404/redirects y registra evidencia. No usar credenciales personales en navegador. Staging nunca se envía. Gates SEO con pruebas de HTML SSR/headers y crawler en Fase 5/8.

Referencia: [Google robots meta y X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag). El bloqueo robots impide que el crawler lea un noindex; por eso se trata por separado del control de acceso de staging.
