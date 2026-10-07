import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase'; // Chequeá que la ruta sea correcta

export const adminGuard: CanActivateFn = async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const supabaseService = inject(SupabaseService);

    // 1. Si venís navegando por botones, el Signal ya cargó súper rápido y te deja pasar
    if (authService.rol() === 'admin') {
        return true;
    }

    // 2. Si recargaste la página con F5 o entraste por URL, el Signal está vacío.
    // Frenamos al Guard y le pedimos a Supabase la sesión actual:
    const { data: { session } } = await supabaseService.supabase.auth.getSession();

    if (!session?.user) {
        return router.parseUrl('/'); // Si no hay nadie logueado, lo mandamos al inicio
    }

    // 3. Vamos a buscar específicamente el rol a tu tabla 'perfiles'
    const { data } = await supabaseService.supabase
        .from('perfiles')
        .select('rol')
        .eq('id', session.user.id)
        .single();

    if (data && data.rol === 'admin') {
        // Si efectivamente es admin, guardamos el dato en el Signal y abrimos la puerta
        authService.rol.set('admin');
        return true;
    }

    // Si es un 'cliente' intentando hacerse el vivo, lo mandamos al inicio
    return router.parseUrl('/');
};