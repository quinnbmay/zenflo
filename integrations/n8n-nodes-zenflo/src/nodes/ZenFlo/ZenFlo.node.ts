import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import axios, { AxiosError } from 'axios';

export class ZenFlo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ZenFlo',
		name: 'zenFlo',
		icon: 'file:zenflo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with ZenFlo mobile sessions',
		defaults: {
			name: 'ZenFlo',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zenFloApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Session',
						value: 'session',
					},
				],
				default: 'message',
			},

			// Message Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send a message to a session (non-blocking)',
						action: 'Send a message',
					},
					{
						name: 'Send and Wait',
						value: 'sendAndWait',
						description: 'Send a message and wait for user reply',
						action: 'Send a message and wait for reply',
					},
				],
				default: 'send',
			},

			// Session Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['session'],
					},
				},
				options: [
					{
						name: 'End',
						value: 'end',
						description: 'End an active session',
						action: 'End a session',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get session details',
						action: 'Get session details',
					},
				],
				default: 'get',
			},

			// Common Fields
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'ses_abc123',
				description: 'The ZenFlo session ID to interact with',
			},

			// Message Send Fields
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['send', 'sendAndWait'],
					},
				},
				default: '',
				placeholder: 'Your message here',
				description: 'The message to send to the session',
				typeOptions: {
					rows: 4,
				},
			},

			// Send and Wait Fields
			{
				displayName: 'Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendAndWait'],
					},
				},
				default: 300,
				description: 'Maximum time to wait for user response (default: 5 minutes)',
			},

			{
				displayName: 'Poll Interval (seconds)',
				name: 'pollInterval',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendAndWait'],
					},
				},
				default: 2,
				description: 'How often to check for user response (default: 2 seconds)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('zenFloApi');

		const apiUrl = credentials.apiUrl as string;
		const apiKey = credentials.apiKey as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const sessionId = this.getNodeParameter('sessionId', i) as string;

				let responseData: any;

				if (resource === 'message') {
					if (operation === 'send') {
						const message = this.getNodeParameter('message', i) as string;

						responseData = await axios.post(
							`${apiUrl}/v1/agents/message`,
							{
								sessionId,
								content: message,
							},
							{
								headers: {
									Authorization: `Bearer ${apiKey}`,
									'Content-Type': 'application/json',
								},
							},
						);

						returnData.push({
							json: responseData.data,
							pairedItem: { item: i },
						});
					} else if (operation === 'sendAndWait') {
						const message = this.getNodeParameter('message', i) as string;
						const timeout = this.getNodeParameter('timeout', i, 300) as number;
						const pollInterval = this.getNodeParameter('pollInterval', i, 2) as number;

						// Send message with requiresUserInput flag
						const sendResponse = await axios.post(
							`${apiUrl}/v1/agents/question`,
							{
								sessionId,
								content: message,
							},
							{
								headers: {
									Authorization: `Bearer ${apiKey}`,
									'Content-Type': 'application/json',
								},
							},
						);

						const messageId = sendResponse.data.messageId;
						const startTime = Date.now();
						const timeoutMs = timeout * 1000;
						const pollIntervalMs = pollInterval * 1000;

						// Poll for user response
						let userReply = null;
						while (Date.now() - startTime < timeoutMs) {
							await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

							const statusResponse = await axios.get(
								`${apiUrl}/v1/agents/reply/${messageId}`,
								{
									headers: {
										Authorization: `Bearer ${apiKey}`,
									},
								},
							);

							if (statusResponse.data.hasReply) {
								userReply = statusResponse.data.reply;
								break;
							}
						}

						if (!userReply) {
							throw new NodeOperationError(
								this.getNode(),
								`Timeout waiting for user response after ${timeout} seconds`,
								{ itemIndex: i },
							);
						}

						returnData.push({
							json: {
								messageId,
								userReply,
								sessionId,
							},
							pairedItem: { item: i },
						});
					}
				} else if (resource === 'session') {
					if (operation === 'get') {
						responseData = await axios.get(`${apiUrl}/v1/session/${sessionId}`, {
							headers: {
								Authorization: `Bearer ${apiKey}`,
							},
						});

						returnData.push({
							json: responseData.data,
							pairedItem: { item: i },
						});
					} else if (operation === 'end') {
						responseData = await axios.post(
							`${apiUrl}/v1/agents/session/end`,
							{
								sessionId,
							},
							{
								headers: {
									Authorization: `Bearer ${apiKey}`,
									'Content-Type': 'application/json',
								},
							},
						);

						returnData.push({
							json: responseData.data,
							pairedItem: { item: i },
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as AxiosError).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
