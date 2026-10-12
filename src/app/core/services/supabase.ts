import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root' // una sola instancia para toda la app
})

export class SupabaseService {
    public supabase: SupabaseClient;

    constructor() {
        // inicializo la conexion con la base de datos
        this.supabase = createClient(
            environment.supabaseUrl,
            environment.supabaseKey
        );
    }

    // traigo todas las peliculas disponibles
    async getPeliculas() {
        const { data, error } = await this.supabase
            .from('peliculas')
            .select('*');

        if (error) return [];
        return data;
    }

    // busco una pelicula especifica por su id
    async getPeliculaById(id: string) {
        const { data, error } = await this.supabase
            .from('peliculas')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    // traigo las funciones y salas de una pelicula
    async getFuncionesDePelicula(peliculaId: string) {
        const { data, error } = await this.supabase
            .from('funciones')
            .select('*, salas(nombre)')
            .eq('pelicula_id', peliculaId)
            .order('fecha_hora', { ascending: true });

        if (error) return [];
        return data;
    }

    // traigo los productos del candy bar
    async getProductosCandy() {
        const { data, error } = await this.supabase
            .from('productos')
            .select('*');

        if (error) return [];
        return data;
    }

    // creo un nuevo producto en el candy
    async crearProducto(producto: any) {
        const { data, error } = await this.supabase
            .from('productos')
            .insert(producto)
            .select()
            .single();

        if (error) return null;
        return data;
    }

    // actualizo un producto existente
    async actualizarProducto(id: number, producto: any) {
        const { data, error } = await this.supabase
            .from('productos')
            .update(producto)
            .eq('id', id)
            .select()
            .single();

        if (error) return null;
        return data;
    }

    // borro un producto del candy
    async eliminarProducto(id: number) {
        const { error } = await this.supabase
            .from('productos')
            .delete()
            .eq('id', id);

        if (error) return false;
        return true;
    }

    // consulto los puntos acumulados del usuario
    async getPuntosUsuario(usuarioId: string): Promise<number> {
        if (!usuarioId) return 0;

        const { data, error } = await this.supabase
            .from('usuarios')
            .select('puntos')
            .eq('id', usuarioId)
            .maybeSingle();

        if (error) return 0;
        return data ? (Number(data.puntos) || 0) : 0;
    }

    // registro una compra y actualizo puntos
    async registrarCompra(compra: any, metodoPago: 'tarjeta' | 'puntos' = 'tarjeta'): Promise<{ exito: boolean; ticket?: any; mensaje?: string }> {
        try {
            const { data: authData } = await this.supabase.auth.getUser();
            const usuarioId = authData.user ? authData.user.id : null;

            const datosDeCompra = {
                ...compra,
                usuario_id: usuarioId
            };

            const { data, error } = await this.supabase
                .from('compras')
                .insert(datosDeCompra)
                .select('id')
                .single();

            if (error) throw error;
            return { exito: true, ticket: data };

        } catch (err: any) {
            return { exito: false, mensaje: err.message };
        }
    }

    // valido si un codigo de cupon existe y esta activo
    async validarCupon(codigoInput: string) {
        const codigoLimpio = codigoInput.trim().toUpperCase();

        const { data, error } = await this.supabase
            .from('cupones')
            .select('*')
            .eq('codigo', codigoLimpio)
            .eq('activo', true)
            .single();

        if (error) return null;

        return data;
    }

    // busco una compra por su id para el escaner
    async getCompraPorId(ticketId: string) {
        const { data, error } = await this.supabase
            .from('compras')
            .select('*, funciones(*, peliculas(nombre), salas(nombre))')
            .eq('id', ticketId)
            .single();

        if (error) return null;

        return data;
    }

    // marco el ticket como usado
    async quemarTicket(ticketId: string) {
        const { data, error } = await this.supabase
            .from('compras')
            .update({ qr_usado: true })
            .eq('id', ticketId)
            .select()
            .single();

        if (error) return false;

        return true;
    }

    // guardo acciones importantes en la tabla de auditoria
    async registrarAuditoria(accion: string) {
        const { data: userData } = await this.supabase.auth.getUser();
        const email = userData.user?.email || 'admin@desconocido.com';

        await this.supabase
            .from('auditoria')
            .insert({
                usuario_email: email,
                accion: accion
            });
    }

    // traigo el historial de compras del usuario
    async getMisCompras(usuarioId: string) {
        const { data, error } = await this.supabase
            .from('compras')
            .select('*, funciones(*, peliculas(nombre, imagen_url), salas(nombre))')
            .eq('usuario_id', usuarioId)
            .order('created_at', { ascending: false });

        if (error) return [];

        return data;
    }

    // cancelo una compra y devuelvo el dinero al saldo
    async cancelarCompraYDevolverSaldo(compraId: number, usuarioId: string, montoADevolver: number) {
        try {
            const { data: usuario } = await this.supabase
                .from('usuarios')
                .select('saldo')
                .eq('id', usuarioId)
                .maybeSingle();

            const saldoActual = usuario ? (Number(usuario.saldo) || 0) : 0;
            const nuevoSaldo = saldoActual + montoADevolver;

            await this.supabase
                .from('usuarios')
                .update({ saldo: nuevoSaldo })
                .eq('id', usuarioId);

            await this.supabase
                .from('compras')
                .update({
                    estado: 'cancelada',
                    butacas: []
                })
                .eq('id', compraId);

            return { exito: true };
        } catch (error: any) {
            return { exito: false, mensaje: error.message };
        }
    }

    // traigo las reseñas de una pelicula
    async getResenasPelicula(peliculaId: number) {
        const { data, error } = await this.supabase
            .from('resenas')
            .select('id, estrellas, comentario, fecha')
            .eq('pelicula_id', peliculaId)
            .order('fecha', { ascending: false });

        if (error) return [];

        return data;
    }

    // guardo una nueva reseña
    async agregarResena(peliculaId: number, usuarioId: string, estrellas: number, comentario: string) {
        const { error } = await this.supabase
            .from('resenas')
            .insert({
                pelicula_id: peliculaId,
                usuario_id: usuarioId,
                estrellas: estrellas,
                comentario: comentario
            });

        if (error) return { exito: false, mensaje: error.message };
        
        return { exito: true };
    }
}