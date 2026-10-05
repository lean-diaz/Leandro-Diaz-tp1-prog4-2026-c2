import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service'; // Chequeá la ruta

export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService); // Llamamos a nuestro servicio
    const router = inject(Router);

    // Le preguntamos al Signal: "¿Hay un Pase VIP?"
    if (auth.session()) {
        return true; // Adelante, pasá.
    } else {
        // Si no hay sesión, lo pateamos a la pantalla principal
        return router.parseUrl('/'); 
    }
};