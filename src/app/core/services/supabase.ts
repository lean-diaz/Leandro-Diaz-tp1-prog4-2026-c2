import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root' // creamos una sola instancia para toda la app
})

export class SupabaseService {
    // Cambiamos a public para que el AuthService pueda usar este puente
    public supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient( // Agarra la variable privada y abre el puente de internet guardando la conexión real
            environment.supabaseUrl, // dirección del servidor
            environment.supabaseKey // llave de acceso público
        );
    }

    async getPeliculas() { // avisa que va a tomarse su tiempo (viaja a internet) y no debe congelar la página.
        const { data, error } = await this.supabase // Frena a esperar la respuesta y desestructura los cajones 'data' y 'error'.
            // de la tabla peliculas, traemos todas las columnas
            .from('peliculas')
            .select('*');

        // Si hay error, imprimimos el error y devolvemos un array vacio para que la pagina no se rompa
        if (error) {
            console.error('Error trayendo películas:', error.message);
            return [];
        }

        return data; // Si no hubo error, devuelve las películas encontradas.
    }

    // Nueva función: Recibe un ID (que viene como texto desde la URL)
    async getPeliculaById(id: string) {
        const { data, error } = await this.supabase
            .from('peliculas')
            .select('*')
            .eq('id', id) // LÓGICA SQL: "Donde la columna 'id' sea igual a esta variable"
            .single();    // LÓGICA: "Traeme un solo objeto, no me traigas un array"

        if (error) {
            console.error('Error buscando la película:', error.message);
            return null;
        }

        return data;
    }

    // Busca todas las funciones que correspondan a una película específica
    async getFuncionesDePelicula(peliculaId: string) {
        const { data, error } = await this.supabase
            .from('funciones')
            .select('*, salas(nombre)') // MAGIA RELACIONAL: Trae la función y también el nombre de la sala conectada
            .eq('pelicula_id', peliculaId)
            .order('fecha_hora', { ascending: true }); // Las ordena cronológicamente

        if (error) {
            console.error('Error buscando funciones:', error.message);
            return [];
        }

        return data;
    }

    // Trae todo el catálogo del Candy Bar
    async getProductosCandy() {
        const { data, error } = await this.supabase
            .from('productos')
            .select('*');

        if (error) {
            console.error('Error trayendo el Candy Bar:', error.message);
            return [];
        }
        return data;
    }

    // --- CRUD ADMIN PRODUCTOS ---

    async crearProducto(producto: any) {
        const { data, error } = await this.supabase
            .from('productos')
            .insert(producto)
            .select()
            .single();

        if (error) {
            console.error('Error creando producto:', error.message);
            return null;
        }
        return data;
    }

    async actualizarProducto(id: number, producto: any) {
        const { data, error } = await this.supabase
            .from('productos')
            .update(producto)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error actualizando producto:', error.message);
            return null;
        }
        return data;
    }

    async eliminarProducto(id: number) {
        const { error } = await this.supabase
            .from('productos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error eliminando producto:', error.message);
            return false;
        }
        return true;
    }

    // --- SISTEMA DE PUNTOS ---
    async getPuntosUsuario(usuarioId: string): Promise<number> {
        if (!usuarioId) return 0;

        const { data, error } = await this.supabase
            .from('usuarios')
            .select('puntos')
            .eq('id', usuarioId)
            .maybeSingle();

        if (error) {
            console.error('Error leyendo puntos:', error.message);
            return 0;
        }

        return data ? (Number(data.puntos) || 0) : 0;
    }

    async registrarCompra(compra: any, metodoPago: 'tarjeta' | 'puntos' = 'tarjeta'): Promise<{ exito: boolean; ticket?: any; mensaje?: string }> {
        try {
            // 1. Obtenemos el usuario logueado
            const { data: authData } = await this.supabase.auth.getUser();
            const usuarioId = authData.user ? authData.user.id : null;

            // 2. Preparamos los datos sumando el ID del usuario
            const datosDeCompra = {
                ...compra,
                usuario_id: usuarioId
            };

            // 3. Insertamos en Supabase pidiendo que nos devuelva el ID de la fila
            const { data, error } = await this.supabase
                .from('compras')
                .insert(datosDeCompra)
                .select('id')
                .single();

            if (error) throw error;

            // --- 4. NUEVA LÓGICA DE FIDELIZACIÓN (PUNTOS) ---
            if (usuarioId) {
                const totalGastado = Number(compra.total_pagado || compra.total || 0);

                if (totalGastado > 0) {
                    const { data: usuarioExistente } = await this.supabase
                        .from('usuarios')
                        .select('puntos')
                        .eq('id', usuarioId)
                        .maybeSingle();

                    // Si por alguna razón el trigger no actuó (usuarios viejos), asumimos 0
                    let puntosActuales = usuarioExistente ? (Number(usuarioExistente.puntos) || 0) : 0;
                    let nuevosPuntos = puntosActuales;

                    if (metodoPago === 'tarjeta') {
                        nuevosPuntos += Math.round(totalGastado * 0.10);
                    } else if (metodoPago === 'puntos') {
                        nuevosPuntos -= totalGastado;
                    }

                    // Ahora solo hacemos UPDATE de manera segura
                    await this.supabase
                        .from('usuarios')
                        .update({ puntos: nuevosPuntos })
                        .eq('id', usuarioId);
                }
            }
            // ------------------------------------------------
            // ------------------------------------------------

            // 5. Devolvemos el objeto tal cual lo espera el componente
            return {
                exito: true,
                ticket: data
            };

        } catch (err: any) {
            console.error('Error registrando la compra:', err.message);
            return {
                exito: false,
                mensaje: err.message
            };
        }
    }

    // NUEVO: Busca un cupón por código para aplicar descuentos
    async validarCupon(codigoInput: string) {
        // Pasamos todo a mayúsculas por si el usuario escribe "bienvenida20"
        const codigoLimpio = codigoInput.trim().toUpperCase();

        const { data, error } = await this.supabase
            .from('cupones')
            .select('*')
            .eq('codigo', codigoLimpio)
            .eq('activo', true) // Solo traemos cupones que estén prendidos
            .single(); // Esperamos un solo resultado

        if (error) {
            // Si el error es PGRST116 (No rows found), significa que el cupón no existe, no es un error grave.
            if (error.code !== 'PGRST116') {
                console.error('Error buscando cupón:', error.message);
            }
            return null;
        }

        return data;
    }

    // --- MÉTODOS PARA EL ESCÁNER QR ---

    async getCompraPorId(ticketId: string) {
        const { data, error } = await this.supabase
            .from('compras')
            .select('*, funciones(*, peliculas(nombre), salas(nombre))') // Traemos info completa para mostrarle al empleado
            .eq('id', ticketId)
            .single();

        if (error) {
            return null;
        }
        return data;
    }

    async quemarTicket(ticketId: string) {
        const { data, error } = await this.supabase
            .from('compras')
            .update({ qr_usado: true })
            .eq('id', ticketId)
            .select()
            .single();

        if (error) {
            console.error('Error quemando ticket:', error.message);
            return false;
        }
        return true;
    }


    // --- MÉTODO PARA AUDITORÍA (EL GRAN HERMANO) ---
    async registrarAuditoria(accion: string) {
        // 1. Obtenemos al usuario que está logueado actualmente
        const { data: userData } = await this.supabase.auth.getUser();
        const email = userData.user?.email || 'admin@desconocido.com';

        // 2. Insertamos el registro en la tabla oculta
        const { error } = await this.supabase
            .from('auditoria')
            .insert({
                usuario_email: email,
                accion: accion
            });

        if (error) {
            console.error('Error guardando en auditoría:', error.message);
        }
    }


    // --- MÉTODOS PARA "MIS PELÍCULAS" Y CANCELACIONES ---

    async getMisCompras(usuarioId: string) {
        const { data, error } = await this.supabase
            .from('compras')
            .select('*, funciones(*, peliculas(nombre, imagen_url), salas(nombre))')
            .eq('usuario_id', usuarioId)
            .order('created_at', { ascending: false }); // Las más nuevas primero

        if (error) {
            console.error('Error trayendo historial:', error.message);
            return [];
        }
        return data;
    }

    async cancelarCompraYDevolverSaldo(compraId: number, usuarioId: string, montoADevolver: number) {
        try {
            // 1. Buscamos el saldo actual con maybeSingle() para evitar el error 406 si la fila no existe
            const { data: usuario, error: errorUser } = await this.supabase
                .from('usuarios')
                .select('saldo')
                .eq('id', usuarioId)
                .maybeSingle(); // <-- ESTA ES LA CLAVE SALVADORA

            if (errorUser) throw errorUser;

            // Si el usuario existe, sumamos. Si no existe (es null), asumimos que su saldo era 0.
            const saldoActual = usuario ? (Number(usuario.saldo) || 0) : 0;
            const nuevoSaldo = saldoActual + montoADevolver;

            // 2. Actualizamos el saldo del usuario (si la fila no existe, simplemente no actualiza nada y no tira error)
            const { error: errorUpdateUser } = await this.supabase
                .from('usuarios')
                .update({ saldo: nuevoSaldo })
                .eq('id', usuarioId);

            if (errorUpdateUser) throw errorUpdateUser;

            // 3. Cancelamos la compra y liberamos las butacas (asegurándonos de NO usar .single() acá tampoco)
            const { error: errorCompra } = await this.supabase
                .from('compras')
                .update({
                    estado: 'cancelada',
                    butacas: []
                })
                .eq('id', compraId);

            if (errorCompra) throw errorCompra;

            return { exito: true };
        } catch (error: any) {
            console.error('Error en la cancelación:', error.message);
            return { exito: false, mensaje: error.message };
        }
    }



    // ==========================================
    // --- SISTEMA DE RESEÑAS Y CALIFICACIONES ---
    // ==========================================

    async getResenasPelicula(peliculaId: number) {
        // Traemos las reseñas filtradas por película sin el JOIN problemático
        const { data, error } = await this.supabase
            .from('resenas')
            .select('id, estrellas, comentario, fecha')
            .eq('pelicula_id', peliculaId)
            .order('fecha', { ascending: false });

        if (error) {
            console.error('Error al cargar las reseñas:', error.message);
            return [];
        }

        return data;
    }

    async agregarResena(peliculaId: number, usuarioId: string, estrellas: number, comentario: string) {
        const { error } = await this.supabase
            .from('resenas')
            .insert({
                pelicula_id: peliculaId,
                usuario_id: usuarioId,
                estrellas: estrellas,
                comentario: comentario
            });

        if (error) {
            console.error('Error al guardar la reseña:', error.message);
            return { exito: false, mensaje: error.message };
        }

        return { exito: true };
    }



}