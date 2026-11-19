# Analítica, atribución e integraciones

Implementado: contrato tipado y validado de eventos en src/core/analytics.ts, dispatcher inyectable, gate de consentimiento y deduplicación local acotada. No se cargan etiquetas, no se envían datos a proveedores y no se activan conversiones. Se conectará el dataLayer del navegador en Fase 6 mediante un único loader aprobado. Los componentes aún no disparan eventos de negocio.

Envelope v1: `{event,event_id,schema_version:1,payload}`. event_id UUID estable por interacción; IDs de propiedad opacos conservados de WordPress. No incluir nombres, email, teléfono, texto de mensajes, URL con query/fragment ni direcciones introducidas por usuarios. En search sólo claves de filtros y total; las ubicaciones libres requieren agregación/normalización antes de reporting.

| Evento | Payload | Disparador verificable |
|---|---|---|
| page_view | page_path sin query/fragment | navegación completada, una vez por vista |
| property_list_view | property_ids, list_id | listado mostrado, IDs publicados |
| property_view | property_id | ficha cargada |
| search | result_count, filter_keys | búsqueda ejecutada; no texto libre |
| filter_apply | filter_key, option_id opcional | cambio confirmado; opción de catálogo no PII |
| favorite_add / favorite_remove | property_id | cambio real de favoritos |
| generate_lead | lead_id, form_id, property_id opcional | servidor acepta y persiste consulta, nunca validación local |
| contact_submit | lead_id, form_id | acuse confirmado; no duplicar conversión generate_lead |
| whatsapp_click | property_id | clic en enlace; microevento, NO consulta confirmada |
| publish_property_start | form_id | primera interacción de formulario |
| publish_property_submit | lead_id, form_id | solicitud persistida por servidor |
| schedule_visit | property_id, stage:'opened' | calendario abierto; NO reserva |
| calendly_booking_confirmed | property_id, booking_id, verified:true | webhook/evento proveedor confirmado por servidor |

GTM o gtag directo como propietario único de GA4, nunca ambos cargando la misma propiedad. Desactivar page_view automático cuando el adaptador de navegación lo envíe. Definir qué eventos son key events con responsable comercial; no activar Google Ads/Meta en esta fase. IntegrationSettings contiene IDs públicos y flags; OAuth tokens, Measurement Protocol API secret, CAPI access token y Calendly token sólo servidor.

Deduplicación futura: generar event_id al iniciar acción y conservarlo durante retries, transmitirlo al servidor con la submission e idempotencia, outbox única por installation/provider/event/event_id. Meta browser/CAPI comparten event_name y event_id. GA4 no se supone deduplicado automáticamente para cualquier evento custom: escoger un único canal autoritativo por evento, no emitir generate_lead doble. Deduplicación local es sólo defensa de sesión; no reemplaza idempotencia persistente.

Consentimiento: default denegado para tags no esenciales, preferencias versionadas, revocación, scripts no cargados hasta base legal/consentimiento aplicable. No aceptar snippets arbitrarios. UTM de catálogo permitido y sanitizado; no convertir query arbitraria en datos de cliente. No duplicar etiquetas entre WordPress y React. El panel muestra identificadores/estado, no secretos.

Calendly opcional por inmueble: enabled/url/label/mode, fallback a Consultar si falta enlace válido. Plan de seguimiento para apertura, confirmación, cancelación y reprogramación con webhook firmado y estado de booking persistido. El objeto verified del contrato no constituye prueba criptográfica; sólo servidor autenticado puede emitir confirmaciones a sistemas de conversión. Validar origin de mensajes de embed y correlación; no aceptar postMessage como confirmación de negocio sin verificación. Revisar alcance/API/plan de Calendly autorizado en Fase 6.

Insights: adaptadores server-side GA4 Data API, Search Console API, CRM/submissions y outbox. Mostrar período, zona horaria, fuente, actualización y latencia, distinguir sin conexión/sin datos/error. Reportes de tráfico/canal, vistas por inmueble, búsquedas agregadas, WhatsApp, formularios, publicaciones, agenda, conversión y estados comerciales. Autorización rivton_view_insights, mínimos privilegios, cache por instalación y filtros. Sin datos inventados ni proyecciones presentadas como reales.

Preparar feed publicitario con ID estable, URL canonical, estado, tipo, moneda/precio, imagen con derechos y ubicación permitida. Requisitos de Google/Meta y políticas inmobiliarias se verifican al conectar: no se promete formato definitivo ni se crean campañas/presupuestos/anuncios.

Referencia de eventos y validación en Realtime/DebugView: [Google Analytics, Set up events](https://developers.google.com/analytics/devguides/collection/ga4/events).
