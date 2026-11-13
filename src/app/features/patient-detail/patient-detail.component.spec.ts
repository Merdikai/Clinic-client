import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientDetailComponent } from './patient-detail.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('PatientDetailComponent', () => {
  let component: PatientDetailComponent;
  let fixture: ComponentFixture<PatientDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientDetailComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        provideNoopAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientDetailComponent);
    fixture.componentRef.setInput('id', '00000000-0000-0000-0000-000000000001');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
