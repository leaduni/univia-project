# Guía de Integración y Despliegue de Judge0

## 1. Contexto de Judge0

**Judge0** es un sistema de código abierto y una API robusta para la ejecución de código en línea. Permite compilar y ejecutar código fuente en una amplia variedad de lenguajes de programación de forma segura y escalable.

En el proyecto **UniVia**, utilizamos Judge0 como el motor de ejecución de código para validar los retos de programación generados por la IA. Su integración nos permite:

-   **Validar el código del estudiante** de forma segura en un entorno aislado (sandbox).
-   **Independizar la ejecución de código** del servidor principal de la aplicación, evitando riesgos de seguridad y consumo de recursos.
-   **Proporcionar feedback instantáneo** sobre el éxito o fracaso de una solución de programación.

## 2. Arquitectura Local

Nuestra instancia local de Judge0 se gestiona a través de Docker Compose y consta de tres servicios interconectados que trabajan en conjunto:

-   `server`: El punto de entrada de la API. Este servicio recibe las peticiones HTTP (POST a `/submissions`), las valida y las encola para su procesamiento.
-   `redis`: Actúa como una cola de mensajes (message broker). El `server` publica las tareas de ejecución en esta cola, y los `workers` se suscriben a ella para consumir dichas tareas.
-   `worker`: Es el componente que realiza el trabajo pesado. Escucha la cola de Redis, toma una tarea de ejecución, ejecuta el código fuente en un contenedor seguro (sandbox) y publica el resultado (stdout, stderr, etc.) de vuelta.

El parámetro `wait=true` en la URL de la petición le indica al `server` que espere síncronamente la respuesta del `worker` antes de devolver la respuesta HTTP al cliente.

## 3. Guía de Despliegue

El entorno de Judge0 está completamente containerizado, lo que facilita su despliegue en un entorno de desarrollo local.

### Comandos de Despliegue

Para levantar todos los servicios necesarios, navega al directorio `evaluacion_programacion/judge0-v1.13.1/` y ejecuta el siguiente comando:

```powershell
docker compose up -d
```

Este comando construirá (si es necesario) y levantará los contenedores de `server`, `worker` y `redis` en segundo plano (`-d` de "detached").

> **Nota Importante sobre la Configuración:**
> Para la fase actual de MVP (Producto Mínimo Viable), la instancia de Redis se ha configurado **sin contraseña**. Esto se hizo para simplificar la comunicación interna entre los contenedores del `server` y el `worker`. En un entorno de producción, sería mandatorio asegurar Redis con una contraseña y configuraciones de red más estrictas.

## 4. Pruebas de Conexión (Smoke Tests)

Para verificar que la API de Judge0 está funcionando correctamente sin depender del frontend, puedes enviar una petición POST directamente desde la terminal.

### PowerShell

```powershell
# Define el cuerpo de la petición con el código fuente y el ID del lenguaje (71 para Python 3)
$body = '{"source_code":"print(10+10)","language_id":71}'

# Envía la petición a la API local
Invoke-RestMethod -Uri "http://127.0.0.1:2358/submissions?base64_encoded=false&wait=true" -Method Post -Body $body -ContentType "application/json"
```

### cURL (Alternativa)

```bash
curl -X POST "http://127.0.0.1:2358/submissions?base64_encoded=false&wait=true" 
-H "Content-Type: application/json" 
-d '{"source_code":"print(10+10)","language_id":71}'
```

### Respuesta Exitosa Esperada

Una ejecución exitosa devolverá un objeto JSON que contiene, entre otros campos, el `stdout` y el `status`. Para los comandos de ejemplo anteriores, la respuesta debería ser similar a esta:

```json
{
  "stdout": "20
",
  "status": {
    "id": 3,
    "description": "Accepted"
  },
  "time": "0.005",
  "memory": 1024
  // ... otros campos
}
```

-   `stdout`: "20
" es la salida estándar del programa (`print(10+10)`).
-   `status.description`: "Accepted" indica que el código se ejecutó sin errores de compilación o de tiempo de ejecución.

## 5. Flujo de Evaluación en el Frontend

La integración con el frontend sigue un flujo simple pero efectivo:

1.  El usuario escribe su código en el editor de la interfaz.
2.  Al presionar "Ejecutar Código", el frontend envía el código fuente a la API de Judge0.
3.  Judge0 ejecuta el código y devuelve el resultado (incluyendo `stdout`, `stderr`, etc.).
4.  El frontend toma el valor del campo `stdout` de la respuesta de Judge0.
5.  Este `stdout` se almacena en el estado del componente y se utiliza como la "respuesta del estudiante" cuando se envía la evaluación final.
6.  El backend principal compara este `stdout` capturado con el campo `respuesta_correcta` que fue generado originalmente por Gemini para determinar si la solución es correcta.
