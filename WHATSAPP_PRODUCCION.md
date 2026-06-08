# WhatsApp en produccion para ARV Intelligence

## Recomendacion

Para produccion no conviene depender de WhatsApp Web con QR. Ese flujo sirve para demos o pruebas locales, pero puede romperse, cerrar sesion o generar problemas con politicas de WhatsApp.

La ruta correcta para clientes reales es WhatsApp Business Cloud API o un proveedor oficial.

## Que se necesita

1. Cuenta de Meta Business verificada.
2. App en Meta Developers.
3. Numero de WhatsApp Business conectado a la app.
4. `Phone Number ID`.
5. Token de acceso permanente o gestionado de forma segura.
6. Webhook publico con HTTPS para recibir mensajes.
7. URL backend para enviar respuestas automaticas desde el CRM.
8. Plantillas aprobadas si se enviaran mensajes fuera de la ventana permitida.

## Flujo recomendado

1. Cliente escribe al numero de WhatsApp Business.
2. Meta envia el mensaje al webhook del backend.
3. El backend guarda o actualiza el contacto en el CRM.
4. El motor de reglas busca una palabra clave.
5. Si hay regla, responde por la API oficial.
6. Si no hay regla, marca la conversacion como pendiente para atencion humana.

## Estado actual del MVP

El dashboard actual tiene:

- Modo `Demo QR`: simula escaneo, recepcion y respuesta automatica.
- Modo `Produccion API`: muestra el estado de integracion oficial pendiente de credenciales.
- Constructor de reglas por palabra clave.
- Simulador de mensajes entrantes.
- Respuestas automaticas en el inbox.

El siguiente paso tecnico seria crear un backend con endpoints:

- `GET /webhook/whatsapp` para verificacion de Meta.
- `POST /webhook/whatsapp` para recibir mensajes reales.
- `POST /api/messages/send` para responder desde el CRM.
- `GET /api/conversations` para listar conversaciones reales.
