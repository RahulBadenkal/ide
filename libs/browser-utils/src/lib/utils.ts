import { isNullOrUndefined } from "@ide/ts-utils/src/lib/utils";


export const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.pop()?.split(';')?.shift();
}

export const setCookie = (name: string, value: string, expiresInMs?: number) => {
  let expires = "";
  if (!isNullOrUndefined(expiresInMs)) {
    const date = new Date();
    date.setTime(date.getTime() + expiresInMs);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/;"
}

export const getCurrentSiteAbsoluteUrl = (relativeUrl: string) => {
  const baseUrl = window.location.origin;
  const absoluteUrl = new URL(relativeUrl, baseUrl);
  return absoluteUrl.href;
}


export const loadCSSFile = (url: string) => {
  // For js files, use import() instead
  const existingLink: HTMLLinkElement | null = document.querySelector(`link[href="${url}"]`);
  if (existingLink) {
    return;
  }

  const link: HTMLLinkElement = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;

  document.head.appendChild(link);

  return new Promise((resolve, reject) => {
    link.onload = () => {
      return resolve(1);
    };

    link.onerror = (...args) => {
      return reject(args);
    };
  });
};
