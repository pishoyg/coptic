#include "IbycusIdtWork.h"

__IBYCUS_BEGIN_NAMESPACE

ibyIdFile & operator>>(ibyIdFile & s, ibyIdtWork & rhs) {
        rhs._block = rhs._length = rhs._start_pos = rhs._end_header = 0;
        rhs._Sections.clear();
        rhs._SectsReady = false;
        unsigned char c;
        ibyFile::pos_type sp = s.tellg();

        s >> c;
        if (c != s.idt_new_work)
                if (c == s.idt_eof) {
                        s.setstate(s.eofbit);
                        return s;
                } else {
                        throw IbycusParseException("No new work in IDT file", s.tellg());
                }

        s >> rhs._length >> rhs._block;
        rhs._start_pos = s.tellg();
        rhs._length -= (rhs._start_pos-sp);
        s.seekg(rhs._length + rhs._start_pos); // move past end of work

        return s;
}

void ibyIdtWork::Read(ibyIdFile & s)
{
        s.clear();
        s.seekg(_start_pos);
        //ibyIdFile::pos_type endp = _length + _start_pos;
        unsigned char c;
        s >> _id;

        s >> c;
        if (c != s.idt_desc_ab)
                throw IbycusParseException("Error Reading file: Expected level description", s.tellg());
        s >> c;
        if (c != 1)	// should be level 1
                throw IbycusParseException("Error Reading file: expected level 1 description", s.tellg());

        s.GetLenString(_name);

        ibystring_t ls;
        s >> c;
        while (c == s.idt_desc_nz) {
                s >> c;				// level
                s.GetLenString(_levelDesc[c]); // description
                s >> c;
        }

        _end_header = -1 + s.tellg(); // order solves operator+ ambiguity
}

void ibyIdtWork::_Get(ibyIdFile & s) throw(IbycusParseException)
{
        if (_SectsReady)
                return;

        s.clear();
        s.seekg(_end_header);
        ibyIdFile::pos_type endp = _length + _start_pos;
        while (s.tellg() < endp) {
                // CATCHES AN ERROR IN LAT1351 (Tacitus)
                try {
                        _Sections.push_back(ibyIdtSection(s));
                } catch (IbycusParseException E) {
                        if (s.get() == s.idt_eof)
                                endp = s.tellg();
                        else
                                throw E;
                }
                s.clear();
                _SectsReady = true;
        }
}

ibylen_t ibyIdtWork::Block(ibyIdFile & s, const int sect,
                                                        const IbycusId & id) throw(IbycusNoId, IbycusParseException)
{
        _Get(s);
        return _Sections[sect].Block(id);
}

const IbycusId & ibyIdtWork::End(ibyIdFile & s, int sect)
{
        _Get(s);
        if (sect < 0) {
                sect = _Sections.size()-1;
        }

        return _Sections[sect].End();
}

__IBYCUS_END_NAMESPACE
