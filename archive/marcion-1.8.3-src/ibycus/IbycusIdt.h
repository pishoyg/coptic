/*
 * IbycusIdt.h: IbycusIdtFile class --
 *    Interface to a TLG/PHI .IDT file
 *
 * Copyright (c) 2000  Sean Redmond
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *
 * $Revision: 1.5 $
 * $Date: 2001/10/11 22:12:35 $
 * $Author: seanredmond $
 */

#ifndef	_IBYCUSIDT_H_
#define _IBYCUSIDT_H_

#include "IbycusIdFile.h"
#include "IbycusIdtAuth.h"
#include "IbycusFileException.h"

__IBYCUS_BEGIN_NAMESPACE
class IbycusIdtFile
{
public:
	IbycusIdtFile() : CurrentAuthIndex_(-1)  {};
	IbycusIdtFile(const ibystring_t & id, const ibystring_t & vol);
	virtual ~IbycusIdtFile();
	void Open(const ibystring_t & id, const ibystring_t & vol);
	int Count(const int auth = 0, const int work = -1);
	const ibystring_t & Name(const int auth = 0, const int work = -1);
	const IbycusId & Id(const int auth = 0, const int work = -1,
		const int sect = -1);
	const IbycusId & Start(const int auth = 0, const int work = 0,
		const int sect = 0);
	const IbycusId & End(const int auth = 0, const int work = -1,
		const int sect = -1);
	ibylen_t Block(const int auth = 0, const int work = 0,
		const int sect = 0, const IbycusId & id = IbycusId())
		throw(IbycusNoId);
	int Span(const int auth = 0, const int work = 0, const int sect = 0);
	int tellg();
	int CiteLevels(int auth=0, int work=0);

private:
	//ibylen_t Block_;
	//ibylen_t Length_;
	ibyIdFile Idt_;
	ibyIdtAuth CurrentAuth_;
	int CurrentAuthIndex_;

	void _get(const int auth = 0, const int work = -1, const int sect = -1);
};

__IBYCUS_END_NAMESPACE

#endif	/* Not _IBYCUSIDT_H_ */
