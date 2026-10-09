import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard'; // Lo dejamos por si a futuro protegés otras rutas
import { adminGuard } from './core/guards/admin.guard'; // Importamos el patovica VIP

export const routes: Routes = [
  // Tu ruta principal (la cartelera) -> Apunta a home.ts y la clase Home
  { 
    path: '', 
    loadComponent: () => import('./features/home/home').then(m => m.Home) 
  },
  
  // Tu ruta de compra -> Apunta a compra.ts y la clase Compra
  { 
    path: 'compra/:id', 
    loadComponent: () => import('./features/compra/compra').then(m => m.Compra) 
  },

  // LA PUERTA SECRETA: La ruta del admin
  { 
    path: 'admin', 
    loadComponent: () => import('./features/admin/admin').then(m => m.Admin),
    canActivate: [adminGuard], 
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { 
        path: 'usuarios', 
        loadComponent: () => import('./features/admin-usuarios/admin-usuarios').then(m => m.AdminUsuarios) 
      },
      // --- LOS 3 COMPONENTES NUEVOS ---
      { 
        path: 'peliculas', 
        loadComponent: () => import('./features/admin-peliculas/admin-peliculas').then(m => m.AdminPeliculas) 
      },
      { 
        path: 'salas', 
        loadComponent: () => import('./features/admin-salas/admin-salas').then(m => m.AdminSalas) 
      },
      { 
        path: 'funciones', 
        loadComponent: () => import('./features/admin-funciones/admin-funciones').then(m => m.AdminFunciones) 
      },
      // --- EL NUEVO COMPONENTE DE PRODUCTOS ---
      { 
        path: 'productos', 
        loadComponent: () => import('./features/admin-productos/admin-productos').then(m => m.AdminProductos) 
      }
    ]
  },

  // NUEVA RUTA: Gestión de Usuarios (Protegida por el adminGuard)
  { 
    path: 'admin-usuarios', 
    loadComponent: () => import('./features/admin-usuarios/admin-usuarios').then(m => m.AdminUsuarios),
    canActivate: [adminGuard] 
  },

  // La ruta del login (sin protección, puede entrar cualquiera)
  { 
    path: 'login', 
    loadComponent: () => import('./features/login/login').then(m => m.Login) 
  },

  // RUTA DEL EMPLEADO PARA ESCANEAR
  { 
    path: 'escaner', 
    loadComponent: () => import('./features/empleado-escaner/empleado-escaner').then(m => m.EmpleadoEscaner) 
  },
  
  // Si escriben cualquier fruta en la URL... (SIEMPRE ÚLTIMA)
  { path: '**', redirectTo: '' }
];