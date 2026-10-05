import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard'; // Importamos el patovica

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

  // LA PUERTA SECRETA: La ruta del admin -> Apunta a admin.ts y la clase Admin
  { 
    path: 'admin', 
    loadComponent: () => import('./features/admin/admin').then(m => m.Admin),
    // ACÁ ESTÁ LA MAGIA: canActivate
    canActivate: [authGuard] 
  },

  // Si escriben cualquier fruta en la URL, los mandamos al inicio
  { path: '**', redirectTo: '' }
];