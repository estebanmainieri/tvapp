import { AppRegistry } from 'react-native';
import App from './src/app/App';

const appName = 'TVApp';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
