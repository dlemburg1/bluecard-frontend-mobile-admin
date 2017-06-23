import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { IonicPage, Platform, NavController, NavParams, AlertController, ToastController, LoadingController, ModalController } from 'ionic-angular';
import { API, ROUTES } from '../../global/api.service';
import { Authentication } from '../../global/authentication.service';
import { AppDataService } from '../../global/app-data.service';
import { AuthUserInfo } from '../../models/models';
import { BaseViewController } from '../base-view-controller/base-view-controller';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { Transfer, FileUploadOptions, TransferObject } from '@ionic-native/transfer';
import { File } from '@ionic-native/file';
import * as global from '../../global/global';
//import cloneDeep from 'lodash.cloneDeep';

@IonicPage()
@Component({
  selector: 'page-app-images',
  templateUrl: 'app-images.html'
})
export class AppImagesPage extends BaseViewController {
  type: string;
  isSubmitted: boolean = false;
  auth: AuthUserInfo;
  defaultImg: string = global.defaultImg;
  prependImgString = global.prependImgString;
  currentIndex: number = null;


  // 'name' correspond to fields in db
  values = [
    {label: "'My Card'", name: "homeMyCardImg", img: null, imgSrc: null},
    {label: "'Rewards'", name: "homeRewardsImg", img: null, imgSrc: null},
    {label: "'Order Ahead'", name: "homeOrderAheadImg", img: null, imgSrc: null},
    {label: "'Menu'", name: "homeMenuImg", img: null, imgSrc: null},
    {label: "Your Company Logo", name: "logoImg", img: null, imgSrc: null},
    {label: "Added-To-Cart", name: "addedToCartImg", img: null, imgSrc: null},
    {label: "App Header Bar", name: "appHeaderBarImg", img: null, imgSrc: null},
    {label: "Default (fallback)", name: "defaultImg", img: null, imgSrc: null},
    {label: "Rewards (top of page)", name: "rewardsPageImg", img: null, imgSrc: null},
    {label: "Login Background", name: "loginPageBackgroundImg", img: null, imgSrc: null},
    {label: "Order Complete Background", name: "orderCompleteBackgroundImg", img: null, imgSrc: null},
    {label: "Order Complete (middle of page)", name: "orderCompleteMiddleOfPageImg", img: null, imgSrc: null},
  ];
  editValue = {label: null, name: null, img: null, imgSrc: null};

 constructor(public navCtrl: NavController, 
             public navParams: NavParams, 
             public API: API, 
             public authentication: Authentication,
             public modalCtrl: ModalController, 
             public alertCtrl: AlertController, 
             public toastCtrl: ToastController, 
             public loadingCtrl: LoadingController, 
             private camera: Camera, 
             private transfer: Transfer, 
             private file: File,
             private platform: Platform,
             private domSanitizer: DomSanitizer) { 
    super(navCtrl, navParams, API, authentication, modalCtrl, alertCtrl, toastCtrl, loadingCtrl);
   
  }

  ionViewDidLoad() {
    this.auth = this.authentication.getCurrentUser();
  }

  editValueChange(value, index) {
    // do nothing right now
  }


  // cordova
  getImgCordova() {
    this.presentLoading("Retrieving...");
    const options: CameraOptions = {

      // used lower quality for speed
      quality: 50,
      targetHeight: 600,
      targetWidth: 800,
      destinationType: this.camera.DestinationType.FILE_URI,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      sourceType: 2
    }

    this.platform.ready().then(() => {
      this.camera.getPicture(options).then((imageData) => {
        console.log("imageData, ", imageData);
       // this.appImg.imgSrc = this.domSanitizer.bypassSecurityTrustResourceUrl(imageData);
       // don't need sanitizer b/c used [src] in template instead of src


        this.editValue.img = imageData;
        this.editValue.imgSrc = this.editValue.name + `$` + this.auth.companyOid;
        this.dismissLoading();
      })
    })
    .catch((err) => {
        let shouldPopView = false;
        this.errorHandler.call(this, err, shouldPopView);
        console.log("err: ", err);
      });
  }

  navExplanations() {
    this.presentModal('ExplanationsPage', {type: "app_images"});
  }

  uploadImg(editValue): Promise<any> {
    console.log("inside cordova");
    return new Promise((resolve, reject) => {
        let options: FileUploadOptions = {
          fileKey: 'company-app-img',  // correlates to name in multer
          fileName: editValue.img,        // correlates to name it will be saved as
          headers: {}
        };
        const fileTransfer: TransferObject = this.transfer.create();
        let res = resolve;
        let rej = reject;

        fileTransfer.upload(editValue.imgSrc, ROUTES.uploadImg, options).then((data) => {
          console.log("uploaded successfully... resolving now...");
          res(data);
        })
        .catch((err) => {
          console.log("inside error");
          rej(err);
        });
       
      });
  }

  submit() {
    console.log("inside submit");
    this.presentLoading(AppDataService.loading.saving);
    this.platform.ready().then(() => {
      this.uploadImg(this.editValue).then((data) => {
        this.editValue = { label: null, name: null, img: null, imgSrc: null };
        this.dismissLoading(AppDataService.loading.saved);
      });
    })
    .catch((err) => {
      console.log("err: ", err);
      const shouldPopView = false;
      this.errorHandler.call(this, err, shouldPopView);
    });
  }
}

//////////////////////////////// attempt 1 /////////////////////////////////////////////

/*
  getImgSrcChanges(appImgs, appImgsClone) {
    return appImgs.filter((x, index) => {
      return x.imgSrc !== appImgsClone[index].imgSrc;
    });
  }
  */


/*
    let appImgs: Array<any> = this.getImgSrcChanges(this.appImgs, this.appImgsClone);
    
    this.uploadAsyncImgsArr(appImgs).then((data) => {
      this.API.stack(ROUTES.saveAppImgs, "POST", {appImgs, companyOid: this.auth.companyOid})
        .subscribe(
            (response) => {
              console.log("response: ", response);
            }, (err) => {
              console.log("err: ", err);
              const shouldPopView = false;
              this.errorHandler.call(this, err, shouldPopView)
            });
    })
    .catch((err) => {
      let shouldPopView = false;
      this.errorHandler.call(this, err, shouldPopView)
    });
  }


upload(http:Http, file:Blob, name:string, url:string){
    let formData: FormData = new FormData();
    formData.append("somevariable", this.myextravar);
    formData.append("photo", file, name);
    this.subscription = http.post(url, formData, {withCredentials: true}).map(o => o.json()).subscribe(o => {
        console.log('uploaded', o); 
    }, (err) => {
        console.error('upload err', err);
    })
}

    this.API.stack(ROUTES.getAppImgs + `/${this.auth.companyOid}`, "GET")
        .subscribe(
            (response) => {
              this.appImgs = response.data.appImgs;
              this.appImgsClone = cloneDeep(response.data.appImgs);
            }, (err) => {
              const shouldPopView = false;
              this.errorHandler.call(this, err, shouldPopView)
            });
   // this.getImgs(this.appImgs);


  getImgs(appImgs) {
    
    if (appImgs.length) {
      appImgs.forEach((x) => {
      // x.imgSrc = this.downloadImgAPI(x.img);
      this.downloadImgAPI(x);
      });
    }
  }



  uploadAsyncImgsArr(appImgs: Array<any>): Promise<any> {
    return new Promise((reject, resolve) => {
      appImgs.forEach((x, i) => {
        let options: FileUploadOptions = {
          fileKey: 'company-app-imgs',  // correlates to name in multer
          fileName: x.img,             // correlates to name it will be saved as
          headers: {}
        };
        const fileTransfer: TransferObject = this.transfer.create();
        
        fileTransfer.upload(x.imgSrc, ROUTES.uploadImg, options).then((data) => {
          if (appImgs.length - 1 === i) resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
      });
    });
  }
*/


//////////////////////////////// attempt 2 ///////////////////////////////////////////


/*
  getImg() {
    this.API.stack(ROUTES.getAppImg + `/${this.auth.companyOid}/${this.editValue.name}`, "GET")
        .subscribe(
            (response) => {
              console.log("response.data: ", response.data);
              if (response.data.appImg) {
                this.appImg.img = response.data.img;
              }
            }, (err) => {
              const shouldPopView = false;
              this.errorHandler.call(this, err, shouldPopView)
            });
  }

  // CORDOVA download from node server
  downloadImg(appImg) {
    const fileTransfer: TransferObject = this.transfer.create();
    const url = ROUTES.downloadImg + `?img=${appImg.img}`;

    fileTransfer.download(url, AppDataService.getStorageDirectory + `/${appImg.img}`).then((entry) => {
      console.log('download complete: ' + entry.toURL());
      appImg.imgSrc = entry.toURL();
      // return entry.toURL();
    }, (err) => {
      const shouldPopView = false;
      this.errorHandler.call(this, err, shouldPopView);
    });
  }
*/
