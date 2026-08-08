export interface RouteConfig {
  path: string;
  component: string;
}

export interface RouterState {
  currentPath: string;
  navigate: (path: string) => void;
  back: () => void;
}

export function createRouter(routes: RouteConfig[]): RouterState {
  const currentPath = { value: routes[0]?.path || '/' };
  
  return {
    get currentPath() {
      return currentPath.value;
    },
    navigate(path: string) {
      currentPath.value = path;
    },
    back() {
      currentPath.value = '/';
    },
  };
}
