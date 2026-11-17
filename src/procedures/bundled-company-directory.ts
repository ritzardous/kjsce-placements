import snapshot from '../data/company-directory-snapshot.json';
import {companyDirectorySchema} from '../../shared/company-directory';
export const bundledCompanies=companyDirectorySchema.parse(snapshot).companies;
