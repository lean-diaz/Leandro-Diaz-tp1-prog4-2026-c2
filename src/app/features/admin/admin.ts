import { Component } from '@angular/core';

@Component({
    selector: 'app-admin',
    standalone: true,
    template: `
        <div style="padding: 50px; text-align: center; color: black;">
            <h1>Panel de Administración</h1>
            <p>Bienvenido al Backoffice. Si ves esto, el Guard te dejó pasar.</p>
        </div>
        `
})

export class Admin {}