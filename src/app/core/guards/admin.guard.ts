import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase';

export const adminGuard: CanActivateFn = async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const supabaseService = inject(SupabaseService);

    // si el usuario venia navegando, ya tenemos guardado su rol
    if (authService.rol() === 'admin') {
        return true;
    }

    // al recargar la pagina, le pide a supabase si el navegador tiene un token jwt
    const { data: { session } } = await supabaseService.supabase.auth.getSession();

    // nadie logueado, al inicio
    if (!session?.user) {
        return router.parseUrl('/');
    }

    // preguntamos si el usuario logueado es admin en la tabla perfiles
    const { data } = await supabaseService.supabase
        .from('perfiles')
        .select('rol')
        .eq('id', session.user.id)
        .single();

    // si es admin, guardamos en el signal y abrimos la puerta
    if (data && data.rol === 'admin') {
        authService.rol.set('admin');
        return true;
    }

    // lo mandamos al inicio
    return router.parseUrl('/');
};