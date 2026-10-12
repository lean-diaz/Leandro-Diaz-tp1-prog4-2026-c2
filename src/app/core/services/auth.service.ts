import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class AuthService {
    readonly session = signal<any | null>(null); // sesión de github
    readonly rol = signal<string | null>(null); // admin, empleado, cliente

    constructor(private supabaseService: SupabaseService) {
        // al abrir la app, preguntamos si había una sesión guardada
        this.supabaseService.supabase.auth.getSession().then(({ data }) => {
            this.session.set(data.session);
            // si hay , buscamos si es admin o cliente
            if (data.session?.user) {
                this.cargarRol(data.session.user.id);
            }
        });

        // se queda escuchando cambios de sesion
        this.supabaseService.supabase.auth.onAuthStateChange((_event, session) => {
            this.session.set(session);
            if (session?.user) {
                this.cargarRol(session.user.id);
            } else {
                // si cerró sesion, le borramos el rol para que no quede guardado por error
                this.rol.set(null);
            }
        });
    }

    // busco el rol del usuario en la tabla perfiles
    private async cargarRol(userId: string) {
        const { data, error } = await this.supabaseService.supabase
            .from('perfiles')
            .select('rol')
            .eq('id', userId)
            .single();

        if (data && !error) {
            this.rol.set(data.rol);
        } else {
            console.error('Error al cargar el rol:', error);
            this.rol.set('cliente'); // lo ponemos como cliente por seguridad
        }
    }

    // inicio sesion usando github
    login() {
        return this.supabaseService.supabase.auth.signInWithOAuth({ 
            provider: 'github',
            options: {
                redirectTo: window.location.origin
            }
        });
    }

    // registro un usuario nuevo con correo y clave
    registroConEmail(email: string, password: string) {
        return this.supabaseService.supabase.auth.signUp({ 
            email, 
            password 
        });
    }

    // inicio sesion con correo y clave
    loginConEmail(email: string, password: string) {
        return this.supabaseService.supabase.auth.signInWithPassword({ 
            email, 
            password 
        });
    }

    // cierro la sesion actual
    logout() {
        return this.supabaseService.supabase.auth.signOut();
    }
}