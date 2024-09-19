import express from 'express';
import { room, getDocuments } from "./controllers"
import { httpErrorWrapper, wsErrorWrapper } from '@/helpers/helpers';
import { httpAttachUserInfo, wsAttachUserInfo } from '@/helpers/middlewares';

const router = express.Router();

export const mountRouter = () => {
  // Need to mount ws routes else start getting this error
  // https://stackoverflow.com/questions/75707601/typeerror-router-ws-is-not-a-function-express-ws-typescript
  router.ws('/room',
    wsErrorWrapper(wsAttachUserInfo),
    wsErrorWrapper(room)
  );

  router.get('/documents',
    httpErrorWrapper(httpAttachUserInfo),
    httpErrorWrapper(getDocuments)
  );
}

export default router

