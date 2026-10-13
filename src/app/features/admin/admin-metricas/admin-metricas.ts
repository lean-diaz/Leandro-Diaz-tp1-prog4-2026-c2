import { Component, OnInit, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { SupabaseService } from '../../../core/services/supabase';

// Registramos Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-admin-metricas',
  standalone: true,
  templateUrl: './admin-metricas.html',
  styleUrls: ['./admin-metricas.css']
})
export class AdminMetricas implements OnInit {
  @ViewChild('graficoVentas') graficoCanvas!: ElementRef;
  
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef); // <-- EL SALVAVIDAS DE ANGULAR

  public chart: any;
  public isLoading = true;

  async ngOnInit() {
    await this.cargarDatosReales();
  }

  async cargarDatosReales() {
    this.isLoading = true;

    try {
      // 1. Traemos las compras
      const { data: compras, error } = await this.supabaseService.supabase
        .from('compras')
        .select('butacas, funciones( peliculas( nombre ) )');

      if (error || !compras || compras.length === 0) {
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }

      // 2. Agrupamos las butacas
      const ventasPorPeli: { [key: string]: number } = {};

      compras.forEach((compra: any) => {
        const nombrePeli = compra.funciones?.peliculas?.nombre || 'Desconocida';
        const cantidadEntradas = compra.butacas ? compra.butacas.length : 0;

        if (ventasPorPeli[nombrePeli]) {
          ventasPorPeli[nombrePeli] += cantidadEntradas;
        } else {
          ventasPorPeli[nombrePeli] = cantidadEntradas;
        }
      });

      const nombresPeliculas = Object.keys(ventasPorPeli);
      const cantidadesVendidas = Object.values(ventasPorPeli);

      // 3. Apagamos la carga
      this.isLoading = false;
      
      // 4. Obligamos a Angular a mostrar el <canvas> en el HTML ahora mismo
      this.cdr.detectChanges(); 

      // 5. Como el canvas ya existe seguro, dibujamos el gráfico
      if (this.graficoCanvas) {
        this.crearGrafico(nombresPeliculas, cantidadesVendidas);
      }

    } catch (err) {
      console.error('Fallo en métricas:', err);
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  crearGrafico(labels: string[], datos: number[]) {
    if (this.chart) {
      this.chart.destroy(); 
    }

    this.chart = new Chart(this.graficoCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Entradas Vendidas',
          data: datos, 
          backgroundColor: '#e50914',
          borderColor: '#b20710',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: '#333' } },
          x: { grid: { color: '#333' } }
        },
        plugins: {
          legend: { labels: { color: 'white' } }
        }
      }
    });
  }

  exportarExcel() {
    // Creamos un archivo CSV a mano (Excel lo lee perfecto)
    let csv = "Pelicula,Entradas Vendidas\n";
    
    this.chart.data.labels.forEach((pelicula: string, index: number) => {
      const cantidad = this.chart.data.datasets[0].data[index];
      csv += `${pelicula},${cantidad}\n`;
    });

    // Forzamos la descarga del archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Metricas_CineUTN.csv';
    link.click();
  }

  exportarPDF() {
    window.print(); 
  }
}