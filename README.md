# Laneflow Studio

Aplicacion frontend desarrollada en Angular, estructurada por modulos de negocio y alineada con una arquitectura basada en componentes. El proyecto se encuentra preparado para integrarse con distintos entornos de backend mediante configuracion por variables de entorno.

## Variables de entorno

Copia `.env.example` a `.env` en la raiz del proyecto y configura:

```env
API_BASE_URL=<API_BASE_URL>
```

La aplicacion utiliza esta variable para resolver la URL base de integracion con la API.

## Docker

Entorno de desarrollo:

```bash
docker compose up --build laneflow-studio
```

Entorno de validacion local:

```bash
docker compose up --build laneflow-studio-prod
```

Docker Compose toma la configuracion desde el archivo `.env`.

## Ejecucion local

```bash
npm run start
```

## Estructura

- `src/app/core`: configuracion global, interceptores y servicios base.
- `src/app/layout`: shell principal de la aplicacion.
- `src/app/shared`: componentes y utilidades reutilizables.
- `src/app/features`: modulos funcionales alineados con el backend.

## Modulos

- `auth`
- `admin`
- `design`
- `operation`
- `tracking`
- `analytics`
