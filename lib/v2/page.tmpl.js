import {Page, NavController, ViewController} from 'ionic/ionic';
@Page({
  templateUrl: 'app/<%= name %>/<%= name %>.html',
})
export class <%= nameUppercased %> {
  constructor(nav: NavController, view: ViewController) {
    this.nav = nav;
    this.view = view;
  }
}
