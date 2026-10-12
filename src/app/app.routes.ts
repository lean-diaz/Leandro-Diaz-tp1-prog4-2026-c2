import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard'; // Lo dejamos por si a futuro protegés otras rutas
import { adminGuard } from './core/guards/admin.guard'; // Importamos el patovica VIP
import { AdminMetricas } from './features/admin/admin-metricas/admin-metricas';
import { MisPeliculas } from './features/mis-peliculas/mis-peliculas';

export const routes: Routes = [
  // Tu ruta principal (la cartelera) -> Apunta a home.ts y la clase Home
  { 
    path: '', 
    loadComponent: () => import('./features/home/home').then(m => m.Home) 
  },
  {
    path: 'mis-peliculas',
    component: MisPeliculas
  },
  { 
    path: 'compra/:id', 
    loadComponent: () => import('./features/compra/compra').then(m => m.Compra) 
  },
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
      { 
        path: 'productos', 
        loadComponent: () => import('./features/admin-productos/admin-productos').then(m => m.AdminProductos) 
      },
      { path: 'metricas', component: AdminMetricas },
    ]
  },
  { 
    path: 'admin-usuarios', 
    loadComponent: () => import('./features/admin-usuarios/admin-usuarios').then(m => m.AdminUsuarios),
    canActivate: [adminGuard] 
  },
  { 
    path: 'login', 
    loadComponent: () => import('./features/login/login').then(m => m.Login) 
  },
  { 
    path: 'escaner', 
    loadComponent: () => import('./features/empleado-escaner/empleado-escaner').then(m => m.EmpleadoEscaner) 
  },
  { path: '**', redirectTo: '' }
];