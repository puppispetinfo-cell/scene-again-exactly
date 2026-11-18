# Manual de administración — 0.3.0

## Primer ingreso

Instalar el ZIP en un WordPress de desarrollo o actualizar siguiendo update.md. Abrir RIVTON Core con un administrador autorizado. El dashboard calcula estados reales de los registros accesibles; analítica y SMTP indican No configurado. Los accesos rápidos abren módulos operativos.

Abrir **Importación inicial**. Se puede usar el relevamiento incluido o cargar otro archivo del mismo esquema, de hasta 128 KB. Validar, desplegar los registros propuestos, revisar datos faltantes y aprobar. `ready` se aplica; `unchanged` no duplica; `conflict` se omite. No se fuerza una sobrescritura. Las importaciones permanecen consultables con su recuperación dentro del módulo.

## Constructor de páginas

Elegir una página: Inicio, Propiedades, ficha (plantilla editorial), Nosotros, Contacto, Publicar, Favoritos, FAQs, Privacidad, Cookies, Términos u otra página institucional creada desde el panel. La plantilla de ficha configura bloques editoriales; no crea un inmueble ni reemplaza datos de una propiedad.

El árbol izquierdo selecciona, muestra/oculta y ordena bloques. Se pueden agregar tipos permitidos, duplicar y eliminar con confirmación. La zona central cambia entre Desktop, Tablet y Mobile y permite seleccionar una sección con mouse o teclado. El inspector derecho contiene textos, medios, acciones y ajustes permitidos.

Una página mantiene una base compartida y overrides por dispositivo. Restablecer compartido elimina sólo el valor específico; no duplica la página. Los recursos mobile/desktop se eligen desde WordPress. Los cambios de tipografía, altura, foco y visibilidad se guardan en el documento. La vista central es representativa: no pretende ejecutar sticky stages, animaciones, SSR o el buscador React.

Las escenas de Inicio pertenecen al mismo bloque **Escenas de scroll**, con un máximo de tres para la coreografía vigente. Se editan dentro de ese coordinador, con título, subtítulo, imágenes, foco, superposición, transición, visibilidad y CTA. No se convierten automáticamente en bloques de scroll independientes. La integración siguiente debe respetar ese contrato y las restricciones de movimiento reducido.

**Guardar borrador** conserva el trabajo sin cambiar la publicación. **Publicar** valida y expone el borrador guardado en la API. **Despublicar** retira la versión pública. **Historial** ofrece versiones de documentos y de borradores; restaurar recupera como borrador, nunca publica automáticamente. Las revisiones anteriores a 0.3.0 sólo pueden recuperarse desde la instantánea disponible al actualizar; no se inventa historia que 0.2.0 no guardaba.

Si aparece 412, otra sesión cambió la publicación o el borrador. Si cambió la base publicada, no se rebasa el borrador silenciosamente: usar Historial para revisar y, cuando corresponda, Descartar borrador y recargar publicado; las versiones siguen disponibles. El panel conserva los cambios locales: copiar los textos necesarios, recargar y conciliarlos antes de reintentar. Los errores de red tampoco vacían el editor. Al salir con cambios sin guardar se pide confirmación.

## Propiedades y ubicación

El listado contiene foto, código, título, operación/tipo, ubicación, precio, estados, destacado/agente y actualización. Buscar y filtrar por estado, operación, tipo, localidad o agente; ordenar por actualización, título o precio agrupado por moneda. Hay paginación de 25 registros. El límite de proyección de esta versión es 10.000 registros / 4 MB por catálogo; un exceso devuelve error explícito, no resultados truncados.

El editor tiene diez pestañas: general; ubicación; precio/operación; superficies/ambientes; características/amenities; medios; contacto/visitas; destacados; SEO; publicación. Las galerías permiten seleccionar varios medios, ordenar y elegir la principal. Los videos son recursos nativos de WordPress. No se inventan fotos ni datos personales.

En **Geografía**, crear provincia, localidad y barrio en ese orden. Una localidad requiere una provincia activa, y un barrio una localidad activa. Los selectores de la propiedad son dependientes. El nombre público se deriva de las entidades vinculadas; un cambio de nombre conserva el ID. Archivar o cambiar la jerarquía de un lugar vinculado se rechaza hasta reasignar los registros. Las propiedades antiguas conservan su texto de ubicación hasta asignar relaciones reales.

**Características y amenities** distingue grupos, valores booleanos, numéricos, de selección y texto breve, unidades, iconos permitidos y visibilidad en filtros. Cambiar el tipo de un atributo referenciado se rechaza para preservar la integridad. Dormitorios/baños/superficies mantienen además sus campos estructurales compatibles con la API anterior.

**Tipos y operaciones** admite los nueve tipos iniciales y otros tipos con familia de compatibilidad explícita. Venta/alquiler mantienen sus claves URL reservadas. La familia legacy no sustituye el nombre comercial: React deberá usar propertyTypeId en la integración.

## Medios, marca, contenido y consultas

**Fotos y videos** abre la biblioteca WordPress: subir, buscar, filtrar, reutilizar, revisar dimensiones/peso, editar ALT y descripción. Los controles de selección enlazan attachments reales. Se bloquean SVG activo, formatos fuera de la allowlist y archivos de más de 10 MB. La eliminación de un archivo referenciado debe corregirse antes de guardar/publicar.

**Marca** administra recursos de identidad, colores, tipografías aprobadas y tokens. Los defaults visuales existentes se conservan; el logo público actual es un wordmark construido en React y no se sustituye por una imagen genérica. Se pueden configurar recursos alternativos reales para la integración siguiente.

**Empresa y formularios** contiene presentación, historia, pilares, servicios, valores, contacto, horarios y plantillas de WhatsApp. **Navegación y filtros** configura menús, enlaces y filtros, con fuentes manuales o derivadas de catálogos. FAQs se editan como preguntas y respuestas independientes dentro de la página correspondiente. Los integrantes se administran en Equipo; sus datos no confirmados permanecen vacíos.

La política de almacenamiento y la revisión de privacidad empiezan desactivadas. Submissions no acepta datos hasta habilitar ambas aprobaciones y una política publicada con revisión válida. El flujo contact-intent prepara un enlace WhatsApp tras consentimiento válido; no guarda un lead ni confirma que el mensaje se haya enviado. El envío efectivo sucede en WhatsApp y depende de la persona. Las consultas ya guardadas se gestionan por estado con permisos; SMTP sigue No configurado.

Las integraciones sólo admiten identificadores y opciones autorizadas. No hay campos para pegar JavaScript, CSS o HTML arbitrario. Calendly permanece desactivado. Guardar un ID de analítica no carga etiquetas ni activa conversiones automáticamente.
