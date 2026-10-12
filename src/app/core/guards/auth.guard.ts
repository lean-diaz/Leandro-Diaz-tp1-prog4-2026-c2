import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// decide si pasamos de pantalla
export const authGuard: CanActivateFn = () => {
    // inyectamos los servicios
    const auth = inject(AuthService);
    const router = inject(Router);

    // preguntamos si hay un inicio de sesion, sino lo llevamos a la pantalla principal
    if (auth.session()) {
        return true;
    } else {
        return router.parseUrl('/'); 
    }
};