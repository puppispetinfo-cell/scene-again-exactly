# Auditoría de arquitectura existente

Se inventariaron los archivos versionados de la base, incluidos componentes UI, configuración, tests, recursos y documentos. Los binarios se registran por ruta, tamaño y hash; no se presenta una revisión fotográfica como auditoría de código. El inventario de coincidencias es evidencia rastreable y puede contener primitivas de UI que no corresponden a contenido editorial. Las líneas refieren a la revisión inicial previa al formateo/refactor, no a posiciones futuras.

| Elemento no administrable | Origen actual | Destino / criterio |
|---|---|---|
| Nombre y logo SVG/textual | components/site.tsx Logo | SiteSettings, MediaAsset; conservar SVG actual como fallback aprobado |
| Menús header/mobile/footer y dock | components/site.tsx MENU y array inline | NavigationMenu por ubicación; iconos permitidos, orden, visibilidad |
| Temporarios | site.tsx TEMPORARIOS_URL, home/search | acción externa validada; mismo destino inicial |
| Pie, copyright, legales sin enlaces | site.tsx Footer | textos de SiteSettings y páginas legales reales pendientes |
| Dirección, contactos, redes | data/properties.ts localSettings | snapshot.settings; no inventar teléfono, email o datos fiscales |
| Inmuebles, precios, galerías, destacadas | data/properties.ts | repositorio, Property; conservar IDs 1/2/3 y slugs, favoritos existentes |
| Comodidades como etiquetas | data/properties.ts, filters.ts | PropertyFeature ID estable + proyección legacy amenities |
| Tipos y operaciones cerrados | lib/types.ts, lib/filters.ts | taxonomías + migración versionada; no cambiar URLs venta/alquiler/casa |
| Filtros, límites USD y etiquetas | search-form.tsx, propiedades.index.tsx | SearchFilterDefinition; nombres, opciones, orden y visibilidad conectados al esquema |
| Precio sin moneda explícita en URL | filters.ts precioMax | conservar interpretación USD de las opciones aprobadas; moneda explícita sin conversión ficticia |
| Categorías e iconos home | routes/index.tsx CATS | PropertyCategory + acción de búsqueda e icono permitido |
| Ordenamiento y chips | propiedades.index.tsx | esquema compartido, mantener recientes/precio-asc/precio-desc |
| Escenas, copies, CTA, fotos | components/scroll-story.tsx | PageSection story con contenido estructurado; choreography se conserva |
| Hero, banner, fotografías directas | assets/*.jpg, index/publicar/scroll-story | MediaAsset con ALT, tamaños, naturaleza ilustrativa y derechos |
| Carrusel/snap/cantidad y últimas 4 | styles.css safe-carousel, home loader | opciones tipadas compatibles; nunca aceptar clases/CSS libres |
| Institucional | localTeam, nosotros.tsx, home | TeamMember, PageDefinition; no inventar personas |
| Campos de formulario y opciones | contacto/publicar.tsx, lead-form.tsx | definición de formulario y destinatarios privados; envío aún desconectado |
| Calendly/WhatsApp por inmueble | propiedades.$slug.tsx | integración opcional; no confundir clic con reserva o lead |
| SEO, favicon y fuentes remotas | __root.tsx y head de cada ruta | SEOSettings, SiteSettings y catálogo de fuentes aprobado |
| Colores/glass/sombras | styles.css :root y utilidades | ThemeSettings; defaults verbatim, overrides validados |
| Radios, ancho, espacios, tamaños | estilos y clases Tailwind en todo src | migración incremental a tokens; no cambiar breakpoints/movimiento |
| 404/errores en inglés | __root.tsx, lib/error-page.ts | páginas de sistema editables con fallback técnico seguro |
| Favoritos | hooks/use-favorites.ts localStorage | preferencia local, conservar clave rivton:favorites y IDs |
| Robots permite todos | public/robots.txt | configuración por entorno, revisar antes de staging |

## Riesgos observados

El adaptador anterior aceptaba ACF con any, usaba HTML rendered como título e inventaba fecha al faltar datos. Se reemplazó por validación de snapshot público; ningún endpoint ACF se asume. No hay servidor de formularios, mapa operativo, plugin, sitemap dinámico, consentimiento ni informes. Los avisos actuales de formulario no enviado se mantienen.

Existen tokens CSS útiles pero el ancho 1280px, paddings y tipografías también aparecen en clases. Cambiar todo de una vez pone en riesgo la coreografía mobile; esos puntos permanecen visibles en el inventario y el backlog. La navegación modal actual requiere verificar focus trap/retorno e inert del fondo; no se declara WCAG AA por usar Radix en los selects.
