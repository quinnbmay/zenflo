import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ZenFloApi implements ICredentialType {
	name = 'zenFloApi';
	displayName = 'ZenFlo API';
	documentationUrl = 'https://docs.zenflo.app';
	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://zenflo.combinedmemory.com',
			placeholder: 'https://zenflo.combinedmemory.com',
			description: 'The base URL of your ZenFlo server',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'Enter your ZenFlo API key',
			description: 'API key from your ZenFlo agent configuration',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.apiUrl}}',
			url: '/v1/sessions',
			method: 'GET',
		},
	};
}
