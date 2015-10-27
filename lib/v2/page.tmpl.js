import {Page, NavController} from 'ionic/ionic';
@Page({
  templateUrl: 'app/<%= name %>/<%= name %>.html',
})
export class <%= nameUppercased %> {
  constructor(nav: NavController) {
    this.nav = nav;
  }
}
