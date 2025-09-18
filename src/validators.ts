import Joi from 'joi';
import { MessageValidationSchema, GroupValidationSchema } from './types.js';

export const messageSchema = Joi.object({
  content: Joi.string().required().max(10000).messages({
    'string.empty': 'Message content cannot be empty',
    'string.max': 'Message content cannot exceed 10,000 characters'
  }),
  messageType: Joi.string().valid('text', 'image', 'file', 'system').default('text'),
  groupId: Joi.string().optional(),
  metadata: Joi.object().optional()
});

export const groupSchema = Joi.object({
  name: Joi.string().required().min(1).max(100).messages({
    'string.empty': 'Group name cannot be empty',
    'string.min': 'Group name must be at least 1 character',
    'string.max': 'Group name cannot exceed 100 characters'
  }),
  description: Joi.string().optional().max(500).messages({
    'string.max': 'Group description cannot exceed 500 characters'
  }),
  isPrivate: Joi.boolean().default(false),
  members: Joi.array().items(Joi.string()).optional()
});

export const authSchema = Joi.object({
  token: Joi.string().required().messages({
    'string.empty': 'Authentication token is required'
  })
});

export function validateMessage(data: MessageValidationSchema): { isValid: boolean; error?: string; value?: MessageValidationSchema } {
  const { error, value } = messageSchema.validate(data);

  if (error) {
    return {
      isValid: false,
      error: error.details[0].message
    };
  }

  return {
    isValid: true,
    value
  };
}

export function validateGroup(data: GroupValidationSchema): { isValid: boolean; error?: string; value?: GroupValidationSchema } {
  const { error, value } = groupSchema.validate(data);

  if (error) {
    return {
      isValid: false,
      error: error.details[0].message
    };
  }

  return {
    isValid: true,
    value
  };
}

export function validateAuth(data: { token: string }): { isValid: boolean; error?: string; value?: { token: string } } {
  const { error, value } = authSchema.validate(data);

  if (error) {
    return {
      isValid: false,
      error: error.details[0].message
    };
  }

  return {
    isValid: true,
    value
  };
}
