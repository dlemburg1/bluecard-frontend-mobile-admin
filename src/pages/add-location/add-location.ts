import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Validation } from '../../utils/validation-utils';
import { API, ROUTES } from '../../global/api';
import { Authentication } from '../../global/authentication';
import { Platform, IonicPage, NavController, NavParams, AlertController, ToastController, LoadingController, ModalController } from 'ionic-angular';
import { AppViewData } from '../../global/app-data';
import { AuthUserInfo, ILocation } from '../../models/models';
import { BaseViewController } from '../base-view-controller/base-view-controller';
import { DateUtils } from '../../utils/date-utils';
import { Camera } from '@ionic-native/camera';
import { Transfer } from '@ionic-native/transfer';
import { File } from '@ionic-native/file';
import { ImageUtility } from '../../global/image-utility';
import { Utils } from '../../utils/utils';
import { Geolocation } from '@ionic-native/geolocation';


@IonicPage()
@Component({
  selector: 'page-add-location',
  templateUrl: 'add-location.html'
})
export class AddLocationPage extends BaseViewController {
  days: Array<string> = Utils.getDays();
  myForm: FormGroup;
  selectedLocation: ILocation;
  isSubmitted: boolean;
  auth: AuthUserInfo;
  closedDaysArr: Array<number> = [];
  initHasRun: boolean = false;
  states: Array<string> = Utils.getStates();
  locations: Array<ILocation> = [];
  isCoordsSet: boolean = false;
  imgSrc: string = null;
  img: string = null;
  failedUploadImgAttempts = 0;
  imageUtility: ImageUtility;

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams, 
    public API: API, 
    public authentication: Authentication, 
    public alertCtrl: AlertController, 
    public toastCtrl: ToastController, 
    public loadingCtrl: LoadingController, 
    private formBuilder: FormBuilder,
    private camera: Camera, 
    private transfer: Transfer, 
    private file: File,
    private geolocation: Geolocation,
    private platform: Platform) { 

    super(alertCtrl, toastCtrl, loadingCtrl, navCtrl);

    this.myForm = this.formBuilder.group({
      name: [null, Validators.required],
      address: [null, Validators.compose([Validators.required, Validation.test("isStreetAddress")])],
      city: [null, Validators.required],
      state: ['California', Validators.required],
      zipcode: [null, Validators.compose([Validators.required, Validation.test('isZipcode')])],
      phoneNumber: [null, Validators.compose([Validators.required, Validation.test('isPhoneNumber')])],
      coordsLat: [null],
      coordsLong: [null],
      sundayOpen: [null, Validators.required],
      sundayClose: [null, Validators.required],
      mondayOpen: [null, Validators.required],
      mondayClose: [null, Validators.required],
      tuesdayOpen: [null, Validators.required],
      tuesdayClose: [null, Validators.required],
      wednesdayOpen: [null, Validators.required],
      wednesdayClose: [null, Validators.required],
      thursdayOpen: [null, Validators.required],
      thursdayClose: [null, Validators.required],
      fridayOpen: [null, Validators.required],
      fridayClose: [null, Validators.required],
      saturdayOpen: [null, Validators.required],
      saturdayClose: [null, Validators.required],
      password: [null],
      password2: [null],
      img: [null]
    }, {validator: Validation.isMismatch('password', 'password2')});
  }

  ionViewDidLoad() {
    this.presentLoading();
    this.auth = this.authentication.getCurrentUser();
    
    this.API.stack(ROUTES.getLocations + `/${this.auth.companyOid}`, "GET")
      .subscribe(
          (response) => {
            console.log('response: ', response);
            this.locations = response.data.locations;
            this.dismissLoading();
          }, this.errorHandler(this.ERROR_TYPES.API));
  }

  // coords are set in a service b/c nav and subsequent pop of MapPage
  ionViewDidEnter() {
    if (this.initHasRun) {
      const latAndLong = AppViewData.getLatAndLong();
      if (latAndLong.coordsLat && latAndLong.coordsLong) {
        this.myForm.patchValue({
          coordsLat: latAndLong.coordsLat.toFixed(7) || null,
          coordsLong: latAndLong.coordsLong.toFixed(7) || null
        });
      }
    } else this.initHasRun = true;  
  }

  ionViewDidLeave() {
    AppViewData.setLatAndLong({coordsLat: null, coordsLong: null});
  }

  /* geolocation */
  getCurrentPosition(): Promise<{coordsLat: number, coordsLong: number}> {
    return new Promise((resolve, reject) => {
      this.geolocation.getCurrentPosition().then((data) => {
        const coordsLat = +data.coords.latitude.toFixed(7);
        const coordsLong = +data.coords.longitude.toFixed(7);
        resolve({coordsLat, coordsLong});
      })
      .catch((err) => reject(err));
    })
  }

  /* google maps */
  navMap() {
    const myForm = this.myForm.value;
    let currentLocation = { coordsLat: null, coordsLong: null};

    if (!myForm.coordsLat || !myForm.coordsLong) {
      this.getCurrentPosition().then((data) => {
        currentLocation = {coordsLat: data.coordsLat, coordsLong: data.coordsLong};
        console.log("currentLocation: ", currentLocation);
        this.navCtrl.push('MapPage', {currentLocation});
      })
      .catch(this.errorHandler(this.ERROR_TYPES.PLUGIN.GEOLOCATION));
    } else {
      currentLocation = {coordsLat: myForm.coordsLat, coordsLong: myForm.coordsLong};
      this.navCtrl.push('MapPage', {currentLocation});
    }
    
  }

  /* location hours are in format: 09:00am. conver to ISOstring date format */
  locationChanged(): void {
    let days: any = {
        sundayOpen: this.selectedLocation.sundayOpen,
        sundayClose: this.selectedLocation.sundayClose,
        mondayOpen: this.selectedLocation.mondayOpen,
        mondayClose: this.selectedLocation.mondayClose,
        tuesdayOpen: this.selectedLocation.tuesdayOpen,
        tuesdayClose: this.selectedLocation.tuesdayClose,
        wednesdayOpen: this.selectedLocation.wednesdayOpen,
        wednesdayClose: this.selectedLocation.wednesdayClose,
        thursdayOpen: this.selectedLocation.thursdayOpen,
        thursdayClose: this.selectedLocation.thursdayClose,
        fridayOpen: this.selectedLocation.fridayOpen,
        fridayClose: this.selectedLocation.fridayClose,
        saturdayOpen: this.selectedLocation.saturdayOpen,
        saturdayClose: this.selectedLocation.saturdayClose
      };

      this.setTimesToIsoString(days);
  }

  setTimesToIsoString(days): void {
    let daysOfWeek = Utils.getDays();

    // loop through each day open/close
    daysOfWeek.forEach((x, index) => {
      let dayOpenKey = x.toLowerCase() + "Open";
      let dayCloseKey = x.toLowerCase() + "Close";

      if (days[dayOpenKey] === "closed") this.myForm.patchValue({ [dayOpenKey]: "closed", [dayCloseKey]: "closed"});
      else {
        this.myForm.patchValue({
          [dayOpenKey]: DateUtils.convertTimeStringToIsoString(days[dayOpenKey]),
          [dayCloseKey]: DateUtils.convertTimeStringToIsoString(days[dayCloseKey])
        });
      }
    });
  }
  

  closedToggle(event: any, index: number): void {
    let days = Utils.getDays();
    let ctrlOpen = days[index].toLowerCase() + "Open";
    let ctrlClose = days[index].toLowerCase() + "Close";

    const filterClosedDaysArr = (): Array<number> => {
      return this.closedDaysArr.filter((x) => {
          return x !== index;
      });
    }

    if (!event.checked) {
      this.closedDaysArr = filterClosedDaysArr();
      this.myForm.patchValue({
        [ctrlOpen]: null,
        [ctrlClose]: null
      });
    } else {
      this.myForm.patchValue({
        [ctrlOpen]: "closed",
        [ctrlClose]: "closed"
      });
      this.closedDaysArr = [...this.closedDaysArr, index];  // concat
    }
  }

  getImgCordova() {
    this.presentLoading("Retrieving...");
    this.imageUtility = new ImageUtility(this.camera, this.transfer, this.file, this.platform);
    this.imageUtility.getImgCordova().then((data) => {
      this.dismissLoading();
      this.imgSrc = data.imageData;
      this.myForm.patchValue({
        img: Utils.generateImgName({appImgIndex: 18, name: this.myForm.controls["name"].value, companyOid: this.auth.companyOid})
      })
    })
    .catch(this.errorHandler(this.ERROR_TYPES.PLUGIN.CAMERA));
  }

  dateChange(event) {
    //test
    //debugger;
  }

  uploadImg(myForm): Promise<any> {
    return new Promise((resolve, reject) => {
      this.imageUtility.uploadImg('upload-img-no-callback', myForm.img, this.imgSrc, ROUTES.uploadImgNoCallback).then((data) => {
        resolve();
      })
      .catch((err) => {
        console.log("catch from upload img");
        reject(err);
      })
    })
  }
  
  submit(myForm, isValid: boolean): void {
    this.isSubmitted = true;

    this.presentLoading(AppViewData.getLoading().saving);
    if (myForm.img) {
      this.uploadImg(myForm).then(() => {
        this.finishSubmit(myForm);
      }).catch(this.errorHandler(this.ERROR_TYPES.IMG_UPLOAD))
    } else this.finishSubmit(myForm);
  }

  finishSubmit(myForm) {
    const toData: ToDataSaveLocation = {toData: myForm, companyOid: this.auth.companyOid};

    this.API.stack(ROUTES.saveLocation, "POST", toData)
        .subscribe(
          (response) => {
            this.dismissLoading(AppViewData.getLoading().saved);
            setTimeout(() => {
             this.navCtrl.pop();
            }, 500);  
          }, this.errorHandler(this.ERROR_TYPES.API));
  }
}
interface ToDataSaveLocation {
    toData: any;
    companyOid: number;
}
