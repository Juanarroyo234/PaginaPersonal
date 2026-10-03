# Integración del frontend y JARVIS

## Archivos

- `main.py`: conserva la instancia FastAPI y `/hello/{name}`; ahora entrega el HTML elegido en `/` y sirve la carpeta `static/` bajo `/static`.
- `pagina_logos_corregidos_v2.html`: HTML original del portafolio, conservado con sus estilos, contenido, logos incrustados, secciones y enlaces. Se añadieron el favicon local embebido, el cursor temático y el contenedor accesible del chatbot.
- `static/chatbot.js`: interfaz y respuestas locales de JARVIS.

## Cómo iniciar

Desde la raíz del proyecto:

```bash
uvicorn main:app --reload
```

Abre <http://127.0.0.1:8000/>. No se crea una segunda instancia FastAPI. El archivo `test_main.http` describe las rutas que ya tenía este proyecto; aquí no existe el comando `python -m app.cli servir`.

## Chatbot

JARVIS se ejecuta en el navegador; no llama a servicios externos ni a endpoints del agente. Presenta mensajes accesibles, indicador de escritura, sugerencias, envío con Enter, salto de línea con Shift+Enter, limpieza, contador de palabras y copia de respuestas. Conserva hasta 12 mensajes en `sessionStorage` durante la sesión de la pestaña. El texto se inserta con `textContent`; no se interpreta como HTML.

El robot del encabezado del chat es un SVG local. Las sugerencias iniciales son “Ver paquetes y precios”, “Ver servicios”, “Ver proyectos”, “Ver tecnologías”, “Sobre mí” y “Contacto”; cada botón envía automáticamente su pregunta. Intenciones y comandos disponibles:

- Saludo, presentación y ayuda (`/ayuda`)
- Fecha local (`/fecha`) y hora del dispositivo (`/hora`)
- Paquetes, precios e inclusiones (`/paquetes`, `/precios`), servicios (`/servicios`), tecnologías (`/tecnologias`), proyectos (`/proyectos`), perfil (`/sobre-mi`), contacto (`/contacto`) e inicio (`/inicio`)
- Agradecimiento y despedida

También reconoce expresiones naturales como “¿cuánto cuesta trabajar contigo?”, “¿qué sabes hacer?”, “enséñame lo que has desarrollado” y “¿cómo puedo contactarte?”. Paquetes, características, tecnologías, perfil, contacto y proyecto se leen de los elementos actuales del HTML. Las respuestas de esas intenciones desplazan la página a la sección correspondiente. Mantiene el tema reciente para aclaraciones sobre tecnologías y el proyecto. La respuesta de FastAPI describe su función real aquí: entregar el HTML y los recursos estáticos.

## Cursor y recursos

En equipos con puntero preciso, el cursor normal se reemplaza por un SVG de código embebido en CSS; enlaces y botones conservan el cursor de interacción y campos editables conservan el cursor de texto. En pantallas táctiles se mantiene el comportamiento normal. El logo de Render remoto recibe un fallback de texto estilizado si no carga. Las demás imágenes de la página están embebidas en el HTML. Las fuentes tipográficas siguen cargándose desde Google Fonts con alternativas locales declaradas en CSS.

## Rutas y comprobaciones

- `GET /`: página HTML.
- `GET /static/chatbot.js`: lógica del asistente.
- `GET /hello/{name}`: endpoint preexistente conservado.
- No se usan ni modifican endpoints de agente, Groq, inventario o ropa; este proyecto no los contenía al integrarlo.

Se inició Uvicorn y se comprobaron por HTTP `GET /` (200, HTML), `GET /static/chatbot.js` (200, JavaScript) y `GET /hello/Juan` (200, JSON, mismo saludo preexistente). GJS validó la sintaxis del JavaScript y una prueba con DOM simulado verificó nueve preguntas naturales, seis sugerencias, envío con Enter y limpiar conversación. Firefox headless se cerró al iniciar; por ello no se hizo revisión visual ni de consola en un navegador. Las peticiones externas a Google Fonts y el logo remoto no se validaron; las fuentes tienen alternativas CSS y el logo de Render cuenta con fallback.
