import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmpleadoEscaner } from './empleado-escaner';

describe('EmpleadoEscaner', () => {
  let component: EmpleadoEscaner;
  let fixture: ComponentFixture<EmpleadoEscaner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpleadoEscaner],
    }).compileComponents();

    fixture = TestBed.createComponent(EmpleadoEscaner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
