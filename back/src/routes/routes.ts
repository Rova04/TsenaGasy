// back/src/routes/routes.ts

const express = require('express');
const router = express.Router();
import { requireAuth } from '../middleware/requireAuth'
import { upload } from '../middleware/multer';
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

import * as user from '../controller/userController'
router.post('/addUser', user.addClient); //ok
router.post('/login', user.login); //ok
router.post('/forgotPassword', user.forgotPassword); //same as the down
router.post('/resetPassword', user.resetPassword); //à voir et à développer
router.get('/getAdhesion/vendor', user.adhesionVendor); // ok
router.put('/adhesionDecision/:idMagasin', user.updateVendorStatus); //ok
router.delete('/deleteAdhesion/:idMagasin', user.deleteAdhesion); //ok
router.get('/getAllUser/:adminId', user.getAllUsers); //ok
router.delete('/admin/users/:id', user.deleteUser); //ok
router.put('/user/:id', user.updateUserRole); //ok

import * as product from '../controller/productController'
router.get('/getCategories', product.getCategories); //ok
router.post('/addProduct', upload.array("images", 5), product.createProduct);  //ok
router.post('/addProductLocation', upload.array("images", 5), product.createLocation); //ok
router.get('/getProductbyMerchand/:magasinId', product.getProductsByCommercant); //ok
router.delete('/deleteProduct/:productId', product.deleteProduct); //ok
router.post('/modifyProduct/:productId', upload.array("images", 5), product.updateProduct); //ok
router.post('/productbyMerchand/search/:commercantId', product.searchProductsbyCommercant); //ok
router.get('/popular-products/:magasinId', product.getPopularProducts); // ok
router.get('/admin/products', product.getAllProductsForAdmin); //ok
router.put('/admin/products/decision/:productId', product.updateProductStatus); //ok
router.delete('/admin/delete/:productId', product.deleteProduct); //ok

import * as sponsor from '../controller/sponsorController'
router.post('/sponsor/create', sponsor.createSponsor); //ok
router.get('/sponsors/:magasinId', sponsor.getSponsorsByVendor); //ok
router.put('/sponsor/resend/:id', sponsor.resendSponsor); //ok
router.delete('/sponsor/delete/:id', sponsor.deleteSponsor); //ok
router.post('/sponsors/filter/:magasinId', sponsor.filterSponsorsByVendor); //ok
router.get('/admin/sponsors', sponsor.getAllSponsors); //ok
router.put('/admin/sponsors/:id', sponsor.updateSponsorStatusAdmin); //ok
router.delete('/admin/delete/sponsors/:id', sponsor.deleteSponsor); //ok

import * as dashboard from '../controller/dashboardController'
router.get('/vendor/stats/:magasinId', dashboard.getVendorStats); //ok
router.get('/admin/stats', dashboard.getAdminStats); //ok
router.get('/api/user/:userId', dashboard.getUserProfile); //ok
router.get('/api/sponsor', dashboard.getAllSponsoredProducts); //ok
router.get('/api/getAllproduct', dashboard.getAllProducts); //ok
router.get('/api/getDetails/:id', dashboard.getProductDetailsById); //ok
router.get('/api/favCount/:userId', dashboard.getFavCountByUser); //ok

import * as panier from '../controller/panierController'
router.post('/api/addFavori/:userId', panier.addFavori); //ok
router.delete('/api/removeFav/:userId/:produitId', panier.removeFavori); //ok
router.get('/api/getFavByUser/:userId', panier.getFavorisByUser); //ok
router.post('/api/addPanier/:userId', panier.addToPanier); //ok 
router.get('/api/getPanierByUser/:userId', panier.getPanierByUser); //ok
router.delete('/api/removeLine/:userId/:lineId', panier.removeLinePanier) //ok
router.put('/api/updatePanier/:userId', panier.updatePanier); //ok

import * as commande from '../controller/orderController'
router.post('/add/order', commande.createOrder); //ok
router.get('/orders/:userId', commande.getMyOrders); //ok
router.delete('/orders/:orderId', commande.deleteOrder); //ok
router.put('/orders/hide/:orderId', commande.hideOrderFromClient); //ok
router.put('/vendor/ligne-vente/:lineId/hide', commande.hideLineForVendor); //ok
router.get('/vendor/lignes-vente/:magasinId/delivered', commande.getDeliveredLinesForVendor); //ok

import * as order from '../controller/adminOrder'
router.get('/admin/orders', order.getAllOrdersAdmin); //ok
router.put('/orders/:venteId/ship', order.shipOrderAdmin); //ok
router.get('/vendor/lignes-vente/:magasinId/pending', order.getPendingLinesForVendor); //ok
router.put('/vendor/ligne-vente/:lineId/check', order.checkLineVendor); //ok
router.get('/vendor/lignes-vente/:magasinId/recent', order.getRecentLinesForVendor);

import * as payment from '../controller/paymentController'
router.post("/payments/create-checkout-session", payment.createCheckoutSession); //ok
router.get("/payments/session-status", payment.sessionStatus); //ok
router.post("/payments/confirm-order", payment.confirmOrderPayment); //ok

export default router;