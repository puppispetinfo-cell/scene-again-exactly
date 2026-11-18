# Perfil RIVTON e importación

El ZIP incluye el JSON del relevamiento dentro de `profiles/rivton-intake.php`, protegido contra lectura directa HTTP. La copia de origen está en `wordpress/client-intake/RIVTON_relevamiento_para_codex.json`, fuera del ZIP instalable. Se usa `approved_business_data` para el mapeo; `raw_answers` se conserva como fuente, no como instrucciones. La presentación corregida proviene de los datos aprobados; los nombres del equipo incluyen los acentos confirmados.

## Información preparada

- RIVTON Group; presentación, origen del 03/11/2025, tono, pilares, valores, seis servicios y cobertura provincial.
- Dirección, WhatsApp 5493513437509, rivtongroup@gmail.com, Instagram y horarios informados. Sin teléfono secundario ni redes inventadas.
- Maximiliano Carpio, Alejo Carpio, Tomás Colantone y Antonino Rivilli: registros propios, nombres confirmados y sin cargos, biografías ni fotos inventados.
- Casas, departamentos, terrenos, locales, oficinas, galpones, complejos, fondos de comercio y cocheras; operaciones venta y alquiler. Compatibilidad legacy explícita para los tipos nuevos.
- Provincia Córdoba como cobertura confirmada. No se precargan ciudades ni barrios supuestos.
- Catálogos de características y amenities identificados como `initial-editable`, no como atributos de propiedades reales.
- Inicio, Propiedades, plantilla de ficha, Favoritos, Nosotros, Contacto, Publicar, FAQs, Privacidad, Cookies y Términos. Nuevos textos y FAQs por siete grupos en borrador. Borradores legales con campos pendientes de revisión, sin datos fiscales, comisiones, garantías o plazos inventados.
- Menús iniciales tomados del frontend aprobado cuando el menú está vacío, incluido el destino Temporarios ya existente. No se reemplazan menús editados.
- Hero: «Encontrá\ntu propiedad.» y «Propiedades seleccionadas para cada etapa de tu vida.»; escenas y CTA conservan los textos del código aprobado. Publicá: «Tu propiedad merece una estrategia a su altura.» / «Publicá tu propiedad». Se registran en la biblioteca las imágenes ya existentes, sin reemplazos genéricos. Se identifican como ilustrativas; no se atribuyen a inmuebles o personas reales.
- Plantillas de WhatsApp, campos de consulta y solicitud, mensaje previo a apertura, privacidad y almacenamiento sin aprobación inicial. Calendly desactivado.

La fuente original no se sirve como JSON estático desde el plugin. El contenedor PHP rechaza peticiones HTTP directas sin cargar datos; la lectura se realiza en el servidor para el importador autorizado.

## Validación y recuperación

La previsualización valida los documentos resultantes contra los contratos empaquetados. Emite un token ligado al usuario y con vigencia de 15 minutos; no escribe los documentos propuestos. Aplicar requiere aprobación, nonce y todas las capacidades administrativas necesarias. Vuelve a comprobar revisiones antes de escribir y dentro de la transacción.

Los IDs deterministas permiten reejecución. Un registro idéntico queda `unchanged`; sólo los registros iniciales reconocidos o sin edición posterior quedan `ready`. Las modificaciones del cliente quedan `conflict`, se muestran y no se fuerzan. Las imágenes se registran una vez y se reutilizan. Cada ejecución genera su propio informe, aunque no cree entidades adicionales.

Se conserva respaldo de los registros afectados, su revisión aplicada y metadatos de procedencia. El listado de importaciones permite solicitar reversión. Si existen modificaciones posteriores, se rechaza sin sobrescribirlas. Un registro nuevo se conserva como papelera, con su ID; un registro anterior recupera su documento y estado con una revisión nueva. Los medios se retienen porque pueden estar compartidos. Esto complementa, y no sustituye, un backup completo de base/uploads.

## Únicos datos de contenido que debe completar o aprobar el cliente

1. Catálogo real de propiedades, precios, estados y selección de destacadas.
2. Localidades/barrios efectivamente trabajados y sus relaciones; coordenadas si van a utilizarse.
3. Fotos reales y ALT, cargos y presentaciones personales del equipo, sin inferirlos.
4. Aprobación de Alejo para los nuevos textos institucionales y las FAQs propuestas.
5. Revisión jurídica/comercial de privacidad, cookies y términos: responsable legal, datos fiscales si corresponden, finalidades, conservación, destinatarios/transferencias, derechos y canal de ejercicio.
6. Decisión y aprobación documentada sobre almacenamiento de consultas y consentimiento antes de usar datos personales reales.

SMTP, analítica, dominio definitivo y credenciales de servicios son configuraciones operativas futuras si se habilitan, no datos comerciales que el plugin haya inventado. La instalación/actualización/importación de Hostinger requiere autorización separada y no se ejecutó.
