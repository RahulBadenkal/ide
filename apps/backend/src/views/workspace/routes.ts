import express from 'express';
import { page } from "./controllers"


export const router = express.Router();

router.get('/actions/page', page);
