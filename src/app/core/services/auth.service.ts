import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase'; // Chequeá que la ruta sea correcta

@Injectable({ providedIn: 'root' })
export class AuthService {
    // Nuestro "Pase VIP". Es un Signal que arranca vacío (null)
    readonly session = signal<any | null>(null);

    constructor(private supabaseService: SupabaseService) {
        // 1. Cuando se abre la app, preguntamos a Supabase si el usuario ya estaba logueado
        this.supabaseService.supabase.auth.getSession().then(({ data }) => {
            this.session.set(data.session);
        });

        // 2. Nos quedamos "escuchando". Si el usuario inicia o cierra sesión, el Signal se actualiza solo
        this.supabaseService.supabase.auth.onAuthStateChange((_event, session) => {
            this.session.set(session);
        });
    }

    // Llama a la ventana de GitHub
    login() {
        return this.supabaseService.supabase.auth.signInWithOAuth({ 
            provider: 'github' 
        });
    }

    // Destruye el Pase VIP
    logout() {
        return this.supabaseService.supabase.auth.signOut();
    }
}