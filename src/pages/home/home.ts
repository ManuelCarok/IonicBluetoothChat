import { Component, Injectable } from '@angular/core';
import { IonicPage, Platform, ToastController, AlertController, Refresher } from 'ionic-angular';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial';
import { Observable } from 'rxjs';
import { ISubscription } from "rxjs/Subscription";

@Injectable()
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  li_devices: Array<any> = [];
  mostrarSpiner = true;
  mensaje: string = "";
  conexion: ISubscription;
  conexionMensajes: ISubscription;
  reader: Observable<any>;
  rawListener;

  constructor(
    private platform: Platform, 
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private bluetoothSerial: BluetoothSerial
  ) {}


  ionViewDidEnter() {
    this.platform.ready().then(() => {
      this.buscar_bluetooth().then((success: Array<Object>) => {
        this.li_devices = success;
        this.mostrarSpiner = false;
      }, fail => {
        this.presentToast(fail);
        this.mostrarSpiner = false;
      });
    });
  }
 

  public ngOnDestroy() {
    this.desconectar();
  }
 
  buscar_bluetooth() {
    return new Promise((resolve, reject) => {
      this.bluetoothSerial.isEnabled().then(success =>{
        this.bluetoothSerial.discoverUnpaired().then(success => {
          if (success.length > 0) {
            resolve(success);
          } else {
            reject('No se encontraron dispositivos');
          }
        }).catch((error) => {
          console.log(`[1] Error: ${JSON.stringify(error)}`);
          reject('Bluetooth no disponible en esta plataforma');
        });
      }, fail => {
        console.log(`[2] Error: ${JSON.stringify(fail)}`);
        reject('El bluetooth no está disponible o está apagado');
      });
    });
  }
 
  refresh_bluetooth(refresher: Refresher) {
    console.log(refresher);
    if (refresher) {
      this.buscar_bluetooth().then((successMessage: Array<Object>) => {
        this.li_devices = [];
        this.li_devices = successMessage;
        refresher.complete();
      }, fail => {
        this.presentToast(fail);
        refresher.complete();
      });
    }
  }
 
  revisar_conexion(seleccion) {
    this.bluetoothSerial.isConnected().then(
      isConnected => {
        let alert = this.alertCtrl.create({
          title: 'Reconectar',
          message: '¿Desea reconectar a este dispositivo?',
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel',
              handler: () => {
                console.log('Cancel clicked');
              }
            },
            {
              text: 'Aceptar',
              handler: () => {
                this.desconectar();
                this.conectar(seleccion.id).then(success => {
                  this.presentToast(success);
                }, fail => {
                  this.presentToast(fail);
                });
              }
            }
          ]
        });
        alert.present();
      }, notConnected => {
        let alert = this.alertCtrl.create({
          title: 'Conectar',
          message: '¿Desea conectar el dispositivo?',
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel',
              handler: () => {
                console.log('Cancel clicked');
              }
            },
            {
              text: 'Aceptar',
              handler: () => {
                this.conectar(seleccion.id).then(success => {
                  this.presentToast(success);
                }, fail => {
                  this.presentToast(fail);
                });
              }
            }
          ]
        });
        alert.present();
    });
  }
 
  conectar(id: string) {
    return new Promise((resolve, reject) => {
      this.conexion = this.bluetoothSerial.connect(id).subscribe((data: Observable<any>) => {
        this.enviarMensajes();
        resolve("Conectado");
      }, fail => {
        console.log(`[3] Error conexión: ${JSON.stringify(fail)}`);
        reject("No se logro conectar");
      });
    });
  }

  desconectar() {
    if (this.conexionMensajes) {
      this.conexionMensajes.unsubscribe();
    }
    if (this.conexion) {
      this.conexion.unsubscribe();
    }
  }
 
  enviarMensajes() {
    this.conexionMensajes = this.dataInOut(this.mensaje).subscribe(data => {
      let entrada = data.substr(0, data.length - 1);
      if (entrada != ">") {
        if (entrada != "") {
          console.log(`Entrada: ${entrada}`);
          this.presentToast(entrada);
        }
      } else {
        this.conexionMensajes.unsubscribe();
      }
      this.mensaje = "";
    });
  }

  public dataInOut(message: string) {
    return Observable.create(observer => {
      this.bluetoothSerial.isConnected().then(isConnected => {
        this.reader = Observable.fromPromise(this.bluetoothSerial.write(message))
          .flatMap(() => {
            return this.bluetoothSerial.subscribeRawData()
          })
          .flatMap(() => {
            return this.bluetoothSerial.readUntil('\n');   // <= delimitador
          });
        this.reader.subscribe(data => {
          observer.next(data);
        });
      }, notConected => {
        observer.next("Estas desconectado");
        observer.complete();
      });
    });
  }

  private presentToast(text) {
    let toast = this.toastCtrl.create({
      message: text,
      duration: 3000
    });
    toast.present();
  }
}
