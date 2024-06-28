import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { FirebaseService } from '../services/firebase.servicetest';
import { Router } from '@angular/router';
import { UserService } from '../services/User.Service'; 

@Component({
  selector: 'app-transceivertable',
  templateUrl: './transceivertable.page.html',
  styleUrls: ['./transceivertable.page.scss'],
})
export class TransceivertablePage implements OnInit {
  public consumables: any[];
  public selectedOption: string;
  public selectedHistoryOption: string;
  public selectedConsumables: any = {};
  public consumableQuantities: any = {}; 
  public totalFibers: any[] = [];
  public showTotalFibers: boolean = false;
  public lendFibers: any[] = [];
  public showLendFibers: boolean = false;
  public selectedConsumableslend: any[] = [];

  History: any[] = [];
  showTable = false;
  showDB = false;
  itemsPerPage = 20;
  currentPage = 1;
  paginatedHistory: any[] = [];
  totalPages = 0;

  constructor(
    private alertController: AlertController,
    private firebaseService: FirebaseService,
    private userService: UserService, 
    private router: Router
  ) {
    this.consumables = [];
    this.selectedOption = 'option1';
    this.selectedHistoryOption = 'actionAsc'; 
     

    this.firebaseService.getCollection('HistoryTransceiver').subscribe((historyData: any[]) => {
      
      this.History = historyData.map((item) => {
        const timestamp = item.date.seconds * 1000 + item.date.nanoseconds / 1000000;
        const date = new Date(timestamp);
        const formattedDate = date.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

        return {
          ...item,
          date: formattedDate,
        };
      });
      this.totalPages = Math.ceil(this.History.length / this.itemsPerPage);
      this.sortHistory();
      this.updatePagination();
      
    });
    this.loadLendFibers();
  }




  ngOnInit() {
    const user = this.userService.getUser();
    if (!user) {
      this.router.navigate(['/login']);
    }
    else {
      this.loadConsumables();
      this.sortHistory();
      this.loadTotalFibers();
      this.loadLendFibers();			 
    }
  }

  loadConsumables() {
    this.firebaseService.getCollection('Transceiver').subscribe((data: any[]) => {
      this.consumables = data;
      this.sortConsumables();
    });
  }

  sortConsumables() {
    switch (this.selectedOption) {
      case 'option1':
        this.consumables.sort((a, b) => a.Consumable.localeCompare(b.Consumable));
        break;
      case 'option2':
        this.consumables.sort((a, b) => b.Consumable.localeCompare(a.Consumable));
        break;
      case 'option3':
        this.consumables.sort((a, b) => b.SubTotal - a.SubTotal);
        break;
      case 'option4':
        this.consumables.sort((a, b) => a.SubTotal - b.SubTotal);
        break;
    }
  }

  onOptionChange(event: any) {
    this.selectedOption = event.detail.value;
    this.sortConsumables();
  }

  sortHistory() {
    switch (this.selectedHistoryOption) {
      case 'nameAsc':
        this.History.sort((a, b) => a.consumable.Consumable.localeCompare(b.consumable.Consumable));
        break;
      case 'nameDesc':
        this.History.sort((a, b) => b.consumable.Consumable.localeCompare(a.consumable.Consumable));
        break;
      case 'actionAsc':
        this.History.sort((a, b) => a.action.localeCompare(b.action));
        break;
      case 'userAsc':
        this.History.sort((a, b) => a.user.fullName.localeCompare(b.user.fullName));
        break;
      default:
        case 'actionAsc':
        this.History.sort((a, b) => a.action.localeCompare(b.action));
        break;
    }
  
    this.updatePagination();
  }

  onHistoryOptionChange(event: any) {
    this.selectedHistoryOption = event.detail.value;
    this.sortHistory();
  }

  toggleTable() {
    this.showTable = !this.showTable;
  }

  toggleDB() {
    this.showDB = !this.showDB;
  }
  
  toggleTotalFibers() {
    this.showTotalFibers = !this.showTotalFibers;
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  updatePagination() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedHistory = this.History.slice(startIndex, startIndex + this.itemsPerPage);
  }

  async addConsumable() {
    const user = this.userService.getUser();
    const alert = await this.alertController.create({
      header: 'ADD CONSUMABLE',
      message: 'Enter the details of the new consumable',
      inputs: [
        { name: 'consumable', type: 'text', placeholder: 'Consumable' },
        { name: 'description', type: 'text', placeholder: 'Description' },
        { name: 'partNumber', type: 'text', placeholder: 'Part Number' },
        { name: 'minimumLevel', type: 'number', placeholder: 'Minimum Level' },
        { name: 'maximumLevel', type: 'number', placeholder: 'Maximum Level' },
        { name: 'subtotal', type: 'number', placeholder: 'Total' },
 
      ],
      buttons: [
        { text: 'CANCEL', role: 'cancel' },
        {
          text: 'ADD',
          handler: async (data) => {
            const newId = this.firebaseService.firestore.createId();
            const newConsumable = {
              Id: newId,
              Consumable: data.consumable,
              Description: data.description,
              PartNumber: data.partNumber,
              MinimumLevel: +data.minimumLevel,
              MaximumLevel: +data.maximumLevel,
              SubTotal: +data.subtotal,
             
            };
            const actionAlert = await this.alertController.create({
              header: `Explain the reason for adding ${data.consumable}`,
              inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason' }],
              buttons: [
                { text: 'CANCEL', role: 'cancel' },
                {
                  text: 'ACCEPT',
                  handler: async (reasonData) => {
                    this.firebaseService.setHistory('HistoryTransceiver', {
                      user: this.userService.getUser(), 
                      reason: reasonData.reason,
                      date: new Date(),
                      action: 'add',
                      consumable: newConsumable
                    });

                    this.firebaseService.setCollectionWithId('Transceiver', newId, newConsumable)
                      .then(() => this.loadConsumables())
                      .catch((error) => console.error('Error adding consumable:', error));
                  }
                }
              ]
            });

            await actionAlert.present();
          }
        }
      ]
    });

    await alert.present();
  }

  async updateConsumable(consumable: any) {
    const user = this.userService.getUser();
    const reasonAlert = await this.alertController.create({
      header: 'UPDATE CONSUMABLE',
      message: 'Please provide a reason for the update:',
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason' }],
      buttons: [
        { text: 'CANCEL', role: 'cancel' },
        {
          text: 'NEXT',
          handler: async (reasonData) => {
            const updateAlert = await this.alertController.create({
              header: 'UPDATE CONSUMABLE',
              message: 'New details of the consumable',
              inputs: [
                { name: 'consumable', type: 'text', placeholder: 'Consumable', value: consumable.Consumable },
                { name: 'description', type: 'text', placeholder: 'Description', value: consumable.Description },
                { name: 'partNumber', type: 'text', placeholder: 'Part Number', value: consumable.PartNumber },
                { name: 'minimumLevel', type: 'number', placeholder: 'Minimum Level', value: consumable.MinimumLevel.toString() },
                { name: 'maximumLevel', type: 'number', placeholder: 'Maximum Level', value: consumable.MaximumLevel.toString() },
                { name: 'subtotal', type: 'number', placeholder: 'Total', value: consumable.SubTotal.toString() },
               
              ],
              buttons: [
                { text: 'CANCEL', role: 'cancel' },
                {
                  text: 'SAVE',
                  handler: (data) => {
                    const updatedConsumable = {
                      ...consumable,
                      Consumable: data.consumable,
                      Description: data.description,
                      PartNumber: data.partNumber,
                      MinimumLevel: +data.minimumLevel,
                      MaximumLevel: +data.maximumLevel,
                      SubTotal: +data.subtotal,
                     
                    };

                    this.firebaseService.setHistory('HistoryTransceiver', {
                      user: this.userService.getUser(),
                      reason: reasonData.reason,
                      date: new Date(),
                      action: 'update',
                      consumable: updatedConsumable
                    });

                    this.firebaseService.update(`Transceiver/${consumable.Id}`, updatedConsumable)
                      .then(() => this.loadConsumables())
                      .catch((error) => console.error('Error updating consumable:', error));
                  }
                }
              ]
            });

            await updateAlert.present();
          }
        }
      ]
    });

    await reasonAlert.present();
  }

  async deleteConsumable(consumable: any) {
    const user = this.userService.getUser();
    const reasonAlert = await this.alertController.create({
      header: 'DELETE CONSUMABLE',
      message: `Please provide a reason for deleting ${consumable.Consumable}:`,
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason' }],
      buttons: [
        { text: 'CANCEL', role: 'cancel' },
        {
          text: 'NEXT',
          handler: async (reasonData) => {
																			 
						   
            await this.firebaseService.setHistory('HistoryTransceiver', {
              user: this.userService.getUser(),
              reason: reasonData.reason,
              date: new Date(),
              action: 'delete',
              consumable: consumable
            });

            const deleteAlert = await this.alertController.create({
              header: 'DELETE CONSUMABLE',
              message: `Are you sure you want to delete ${consumable.Consumable}?`,
              buttons: [
                { text: 'CANCEL', role: 'cancel' },
                {
                  text: 'DELETE',
                  handler: () => {
                    this.firebaseService.deleteDocument('Transceiver', consumable.Id)
                      .then(() => this.loadConsumables())
                      .catch((error) => console.error('Error deleting consumable:', error));
                  }
                }
              ]
            });

            await deleteAlert.present();
          }
        }
      ]
    });

    await reasonAlert.present();
  }

  logout() {
    this.userService.clearUser();
    this.router.navigate(['/login']);
  }


  updateSelectedConsumables(event: any, consumable: any) {
    if (event.detail.checked) {
      this.selectedConsumables[consumable.Id] = consumable;
    } else {
      delete this.selectedConsumables[consumable.Id];
    }
  }
  
  updateConsumableQuantity(event: any, consumable: any) {
    const quantity = event.detail.value;
    this.consumableQuantities[consumable.Id] = quantity;
  }
  
  updateTotal() {
    for (const id in this.selectedConsumables) {
      const consumable = this.selectedConsumables[id];
      const quantity = this.consumableQuantities[id];
      const updatedTotal = consumable.SubTotal + parseInt(quantity, 10);
  
      this.firebaseService.setCollectionWithId('totalTransceiver', consumable.Id, {
        ...consumable,
        Total: updatedTotal
      })
      .catch((error) => console.error('Error updating total:', error));
    }
  }
  
  loadTotalFibers() {
    this.firebaseService.getCollection('totalTransceiver').subscribe((data: any[]) => {
      this.totalFibers = data;
    });
  }

  toggleLendFibers() {
    this.showLendFibers = !this.showLendFibers;
  }
  
  updateSelectedConsumableslend(event: any, consumable: any) {
    if (event.detail.checked) {
      this.selectedConsumableslend.push({
        ...consumable,
        quantity: 0,
        comment: ''
      });
    } else {
      this.selectedConsumableslend = this.selectedConsumableslend.filter(c => c.Id !== consumable.Id);
    }
    console.log(this.selectedConsumableslend); 
  }

  updateConsumableQuantitylend(event: any, consumable: any) {
    const index = this.selectedConsumableslend.findIndex(c => c.Id === consumable.Id);
    if (index !== -1) {
      this.selectedConsumableslend[index].quantity = event.detail.value;
    }
    console.log(this.selectedConsumableslend); 
  }

  updateConsumableComment(event: any, consumable: any) {
    const index = this.selectedConsumableslend.findIndex(c => c.Id === consumable.Id);
    if (index !== -1) {
      this.selectedConsumableslend[index].comment = event.detail.value;
    }
    console.log(this.selectedConsumableslend); 
  }

  updateLendTotal() {
    console.log("Updating Lend Total...");
    this.selectedConsumableslend.forEach(selected => {
      const updatedTotal = selected.SubTotal + parseInt(selected.quantity, 10);
      const newLendFiber = {
        Load:selected.quantity,
        Consumable: selected.Consumable,
        Total: updatedTotal,
        Comment: selected.comment,
        Date: new Date()
      };
      
      this.firebaseService.setCollectionWithId('lendTransceiver', this.firebaseService.firestore.createId(), newLendFiber)
        .then(() => {
          console.log(`Updated lend Transceiver: ${newLendFiber.Consumable}`);
          this.loadLendFibers();
        })
        .catch((error) => console.error('Error updating lend Transceiver:', error));
    });
  }

  loadLendFibers() {
    this.firebaseService.getCollection('lendTransceiver').subscribe((data: any[]) => {
      this.lendFibers = data.map((item) => {
        const timestamp = item.Date.seconds * 1000 + item.Date.nanoseconds / 1000000;
        const date = new Date(timestamp);
        const formattedDate = date.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  
        return {
          ...item,
          Date: formattedDate,
        };
      });
      this.lendFibers.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    });
  }
}
