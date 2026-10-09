import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-productos.html',
  styleUrls: ['./admin-productos.css']
})
export class AdminProductos implements OnInit {
  productos = signal<any[]>([]);
  productoForm: FormGroup;
  editandoId = signal<number | null>(null);

  // Categorías fijas según el pedido
  categorias = ['Snack', 'Bebida', 'Combo'];

  constructor(
    private supabaseService: SupabaseService,
    private fb: FormBuilder
  ) {
    // Definimos la estructura del formulario
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      categoria: ['Snack', Validators.required],
      precio: [0, [Validators.required, Validators.min(0)]],
      costo_en_puntos: [0, [Validators.required, Validators.min(0)]],
      imagen_url: ['https://placehold.co/200x200/png?text=Producto'],
      incluye_entrada: [false]
    });
  }

  async ngOnInit() {
    await this.cargarProductos();
  }

  async cargarProductos() {
    const data = await this.supabaseService.getProductosCandy();
    this.productos.set(data);
  }

  // Carga los datos de un producto en el formulario para editarlo
  editarProducto(producto: any) {
    this.editandoId.set(producto.id);
    this.productoForm.patchValue({
      nombre: producto.nombre,
      categoria: producto.categoria,
      precio: producto.precio,
      costo_en_puntos: producto.costo_en_puntos,
      imagen_url: producto.imagen_url || 'https://placehold.co/200x200/png?text=Producto',
      incluye_entrada: producto.incluye_entrada || false
    });
  }

  cancelarEdicion() {
    this.editandoId.set(null);
    this.productoForm.reset({
      categoria: 'Snack',
      precio: 0,
      costo_en_puntos: 0,
      imagen_url: 'https://placehold.co/200x200/png?text=Producto',
      incluye_entrada: false
    });
  }

  async guardarProducto() {
    if (this.productoForm.invalid) {
      alert('Por favor completá los campos obligatorios.');
      return;
    }

    const formValues = this.productoForm.value;
    const id = this.editandoId();

    if (id) {
      // Actualizar
      const actualizado = await this.supabaseService.actualizarProducto(id, formValues);
      if (actualizado) {
        alert('Producto actualizado.');
        this.cancelarEdicion();
        this.cargarProductos();
      }
    } else {
      // Crear nuevo
      const nuevo = await this.supabaseService.crearProducto(formValues);
      if (nuevo) {
        alert('Producto creado.');
        this.cancelarEdicion();
        this.cargarProductos();
      }
    }
  }

  async eliminarProducto(id: number) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      const exito = await this.supabaseService.eliminarProducto(id);
      if (exito) {
        this.cargarProductos();
      }
    }
  }
}